import { Debugger } from 'debug';
import { Filter, NostrEvent, Relay, matchFilters } from 'nostr-tools';
import _throttle from 'lodash.throttle';

import Subject from './subject';
import { logger } from '../helpers/debug';
import EventStore from './event-store';
import { mergeFilter } from '../helpers/nostr/filter';
import { nanoid } from 'nanoid';

const DEFAULT_CHUNK_SIZE = 100;

export type EventFilter = (event: NostrEvent, store: EventStore) => boolean;

export default class ChunkedRequest {
	id = nanoid(8);
	relay: Relay;
	filters: Filter[];
	chunkSize = DEFAULT_CHUNK_SIZE;
	private log: Debugger;
	private subs: ZenObservable.Subscription[] = [];

	loading = false;
	events: EventStore;
	/** set to true when the next chunk produces 0 events */
	complete = false;

	private lastChunkIdx = 0;
	onChunkFinish = new Subject<number>();

	constructor(relay: Relay, filters: Filter[], log?: Debugger) {
		this.relay = relay;
		this.filters = filters;

		this.log = log || logger.extend(relay.url);
		this.events = new EventStore(relay.url);
	}

	loadNextChunk() {
		this.loading = true;
		let filters: Filter[] = mergeFilter(this.filters, {
			limit: this.chunkSize,
		});
		let oldestEvent = this.getLastEvent();
		if (oldestEvent) {
			filters = mergeFilter(filters, {
				until: oldestEvent.created_at - 1,
			});
		}

		let gotEvents = 0;
		const sub = this.relay.subscribe(filters, {
			// @ts-expect-error
			id: this.id + '-' + this.lastChunkIdx++,
			onevent: (event) => {
				this.handleEvent(event);
				gotEvents++;
			},
			oneose: () => {
				this.loading = false;
				if (gotEvents === 0) {
					this.complete = true;
					this.log('Complete');
				} else this.log(`Got ${gotEvents} events`);
				this.onChunkFinish.next(gotEvents);
				sub.close();
			},
		});
	}

	private handleEvent(event: NostrEvent) {
		if (!matchFilters(this.filters, event)) return;
		return this.events.addEvent(event);
	}

	getFirstEvent(nth = 0, eventFilter?: EventFilter) {
		return this.events.getFirstEvent(nth, eventFilter);
	}
	getLastEvent(nth = 0, eventFilter?: EventFilter) {
		return this.events.getLastEvent(nth, eventFilter);
	}

	destroy() {
		for (const sub of this.subs) sub.unsubscribe();
		this.subs = [];
	}
}
