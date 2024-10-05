import dayjs from 'dayjs';
import { Debugger } from 'debug';
import { Filter, NostrEvent } from 'nostr-tools';
import { AbstractRelay } from 'nostr-tools/abstract-relay';
import _throttle from 'lodash.throttle';
import Observable from 'zen-observable';
import { isReplaceable } from '@satellite-earth/core/helpers/nostr';

import MultiSubscription from './multi-subscription';
import { PersistentSubject } from './subject';
import { logger } from '../helpers/debug';
import EventStore from './event-store';
import replaceableEventsService from '../services/replaceable-events';
import { mergeFilter, isFilterEqual } from '../helpers/nostr/filter';
import SuperMap from './super-map';
import ChunkedRequest from './chunked-request';
import relayPoolService from '../services/relay-pool';

const BLOCK_SIZE = 100;

export type EventFilter = (event: NostrEvent, store: EventStore) => boolean;

export default class TimelineLoader {
	cursor = dayjs().unix();
	filters: Filter[] = [];
	relays: AbstractRelay[] = [];

	events: EventStore;
	timeline = new PersistentSubject<NostrEvent[]>([]);
	loading = new PersistentSubject(false);
	complete = new PersistentSubject(false);

	loadNextBlockBuffer = 2;
	eventFilter?: EventFilter;

	name: string;
	private log: Debugger;
	private subscription: MultiSubscription;

	private cacheLoader: ChunkedRequest | null = null;
	private loaders = new Map<string, ChunkedRequest>();

	constructor(name: string) {
		this.name = name;

		this.log = logger.extend('TimelineLoader:' + name);
		this.events = new EventStore(name);

		this.subscription = new MultiSubscription(name);
		this.subscription.onEvent.subscribe(this.handleEvent.bind(this));

		// update the timeline when there are new events
		this.events.onEvent.subscribe(this.throttleUpdateTimeline.bind(this));
		this.events.onDelete.subscribe(this.throttleUpdateTimeline.bind(this));
		this.events.onClear.subscribe(this.throttleUpdateTimeline.bind(this));
	}

	private throttleUpdateTimeline = _throttle(this.updateTimeline, 10);
	private updateTimeline() {
		if (this.eventFilter) {
			const filter = this.eventFilter;
			this.timeline.next(this.events.getSortedEvents().filter((e) => filter(e, this.events)));
		} else this.timeline.next(this.events.getSortedEvents());
	}
	private handleEvent(event: NostrEvent, cache = true) {
		// if this is a replaceable event, mirror it over to the replaceable event service
		if (isReplaceable(event.kind)) replaceableEventsService.handleEvent(event);

		this.events.addEvent(event);
		// if (cache && localRelay) localRelay.publish(event);
	}
	private handleChunkFinished() {
		this.updateLoading();
		this.updateComplete();
	}

	private chunkLoaderSubs = new SuperMap<ChunkedRequest, ZenObservable.Subscription[]>(() => []);
	private connectToChunkLoader(loader: ChunkedRequest) {
		this.events.connect(loader.events);
		const subs = this.chunkLoaderSubs.get(loader);
		subs.push(loader.onChunkFinish.subscribe(this.handleChunkFinished.bind(this)));
	}
	private disconnectFromChunkLoader(loader: ChunkedRequest) {
		loader.destroy();
		this.events.disconnect(loader.events);
		const subs = this.chunkLoaderSubs.get(loader);
		for (const sub of subs) sub.unsubscribe();
		this.chunkLoaderSubs.delete(loader);
	}

	setFilters(filters: Filter[]) {
		if (isFilterEqual(this.filters, filters)) return;

		this.log('Set filters', filters);

		// recreate all chunk loaders
		for (const relay of this.relays) {
			const loader = this.loaders.get(relay.url);
			if (loader) {
				this.disconnectFromChunkLoader(loader);
				this.loaders.delete(relay.url);
			}

			const chunkLoader = new ChunkedRequest(
				relayPoolService.requestRelay(relay.url),
				filters,
				this.log.extend(relay.url),
			);
			this.loaders.set(relay.url, chunkLoader);
			this.connectToChunkLoader(chunkLoader);
		}

		// set filters
		this.filters = filters;

		// recreate cache chunk loader
		// if (this.cacheChunkLoader) this.disconnectFromChunkLoader(this.cacheChunkLoader);
		// if (localRelay) {
		// 	this.cacheChunkLoader = new ChunkedRequest(localRelay, this.filters, this.log.extend('cache-relay'));
		// 	this.connectToChunkLoader(this.cacheChunkLoader);
		// }

		// update the live subscription query map and add limit
		this.subscription.setFilters(mergeFilter(filters, { limit: BLOCK_SIZE / 2 }));
	}

	setRelays(relays: Iterable<string | URL | AbstractRelay>) {
		const newRelays = relayPoolService.getRelays(relays);

		// remove chunk loaders
		for (const relay of newRelays) {
			const loader = this.loaders.get(relay.url);
			if (!loader) continue;
			if (!this.relays.includes(relay)) {
				this.disconnectFromChunkLoader(loader);
				this.loaders.delete(relay.url);
			}
		}

		// create chunk loaders only if filters are set
		if (this.filters.length > 0) {
			for (const relay of newRelays) {
				if (!this.loaders.has(relay.url)) {
					const loader = new ChunkedRequest(relay, this.filters, this.log.extend(relay.url));
					this.loaders.set(relay.url, loader);
					this.connectToChunkLoader(loader);
				}
			}
		}

		this.relays = relayPoolService.getRelays(relays);

		// update live subscription
		this.subscription.setRelays(this.relays);
	}

	setEventFilter(filter?: EventFilter) {
		this.eventFilter = filter;
		this.updateTimeline();
	}
	setCursor(cursor: number) {
		this.cursor = cursor;
		this.triggerChunkLoad();
	}

	private getAllLoaders() {
		return this.cacheLoader ? [...this.loaders.values(), this.cacheLoader] : Array.from(this.loaders.values());
	}

	triggerChunkLoad() {
		let triggeredLoad = false;
		for (const [url, loader] of this.loaders) {
			// skip loader if its already loading or complete
			if (loader.complete || loader.loading) continue;

			const event = loader.getLastEvent(this.loadNextBlockBuffer, this.eventFilter);
			if (!event || event.created_at >= this.cursor) {
				loader.loadNextChunk();
				triggeredLoad = true;
			}
		}

		if (triggeredLoad) this.updateLoading();
	}
	loadAllNextChunks() {
		let triggeredLoad = false;
		for (const [url, loader] of this.loaders) {
			// skip loader if its already loading or complete
			if (loader.complete || loader.loading) continue;

			loader.loadNextChunk();
			triggeredLoad = true;
		}

		if (triggeredLoad) this.updateLoading();
	}

	private updateLoading() {
		for (const [url, loader] of this.loaders) {
			if (loader.loading) {
				if (!this.loading.value) {
					this.loading.next(true);
					return;
				}
			}
		}
		if (this.loading.value) this.loading.next(false);
	}
	private updateComplete() {
		for (const [url, loader] of this.loaders) {
			if (!loader.complete) {
				this.complete.next(false);
				return;
			}
		}
		return this.complete.next(true);
	}
	open() {
		this.subscription.open();
	}
	close() {
		this.subscription.close();
	}

	private deleteStreamSub: ZenObservable.Subscription | null = null;
	setDeleteStream(stream: Observable<NostrEvent>, extraCheck?: (event: NostrEvent) => boolean) {
		if (this.deleteStreamSub) this.deleteStreamSub.unsubscribe();
		this.deleteStreamSub = stream.subscribe((event) => this.events.handleDeleteEvent(event, extraCheck));
	}

	forgetEvents() {
		this.events.clear();
		this.timeline.next([]);
		this.subscription.forgetEvents();
	}
	reset() {
		this.cursor = dayjs().unix();
		for (const [url, loader] of this.loaders) this.disconnectFromChunkLoader(loader);
		this.loaders.clear();
		this.cacheLoader = null;
		this.forgetEvents();
	}

	/** close the subscription and remove any event listeners for this timeline */
	destroy() {
		this.close();

		this.deleteStreamSub?.unsubscribe();

		for (const [url, loader] of this.loaders) this.disconnectFromChunkLoader(loader);
		this.loaders.clear();
		this.cacheLoader = null;

		this.subscription.destroy();

		this.events.cleanup();
	}
}
