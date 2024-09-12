import { Filter, NostrEvent, SimplePool } from 'nostr-tools';
import _throttle from 'lodash.throttle';
import { EventEmitter } from 'events';
import { getInboxes, getOutboxes } from '@satellite-earth/core/helpers/nostr/mailboxes.js';
import SuperMap from '@satellite-earth/core/helpers/super-map.js';

import createDefer, { Deferred } from '../helpers/deferred.js';
import { COMMON_CONTACT_RELAYS } from '../env.js';

type EventMap = {
	event: [NostrEvent];
	batch: [number, number];
};

/** Loads 10002 events for pubkeys */
export default class PubkeyBatchLoader extends EventEmitter<EventMap> {
	extraRelays = COMMON_CONTACT_RELAYS;

	kind: number;
	pool: SimplePool;
	loadFromCache?: (pubkey: string) => NostrEvent | undefined;

	get queue() {
		return this.next.size;
	}

	failed = new SuperMap<string, Set<string>>(() => new Set());

	constructor(kind: number, pool: SimplePool, loadFromCache?: (pubkey: string) => NostrEvent | undefined) {
		super();
		this.kind = kind;
		this.pool = pool;
		this.loadFromCache = loadFromCache;
	}

	private cache = new Map<string, NostrEvent>();
	getEvent(pubkey: string) {
		if (this.cache.has(pubkey)) return this.cache.get(pubkey)!;

		const event = this.loadFromCache?.(pubkey);
		if (event) {
			this.cache.set(pubkey, event);
			return event;
		}
	}

	getOutboxes(pubkey: string) {
		const mailboxes = this.getEvent(pubkey);
		return mailboxes && getOutboxes(mailboxes);
	}

	getInboxes(pubkey: string) {
		const mailboxes = this.getEvent(pubkey);
		return mailboxes && getInboxes(mailboxes);
	}

	handleEvent(event: NostrEvent) {
		if (event.kind === this.kind) {
			this.emit('event', event);
			const current = this.cache.get(event.pubkey);
			if (!current || event.created_at > current.created_at) this.cache.set(event.pubkey, event);
		}
	}

	/** next queue */
	private next = new Map<string, string[]>();
	/** currently fetching */
	private fetching = new Map<string, string[]>();
	/** promises for next and fetching */
	private pending = new Map<string, Deferred<NostrEvent | null>>();

	private fetchEventsThrottle = _throttle(this.fetchEvents.bind(this), 1000);
	private async fetchEvents() {
		if (this.fetching.size > 0 || this.next.size === 0) return;

		// copy all from next queue to fetching queue
		for (const [pubkey, relays] of this.next) this.fetching.set(pubkey, relays);
		this.next.clear();

		if (this.fetching.size > 0) {
			const filters: Record<string, Filter> = {};

			for (const [pubkey, relays] of this.fetching) {
				for (const relay of relays) {
					filters[relay] = filters[relay] || { kinds: [this.kind], authors: [] };

					if (!filters[relay].authors?.includes(pubkey)) {
						filters[relay].authors?.push(pubkey);
					}
				}
			}

			const requests: Record<string, Filter[]> = {};
			for (const [relay, filter] of Object.entries(filters)) requests[relay] = [filter];

			await new Promise<void>((res) => {
				const sub = this.pool.subscribeManyMap(requests, {
					onevent: (event) => this.handleEvent(event),
					oneose: () => {
						sub.close();

						// resolve all pending promises
						let failed = 0;
						let found = 0;
						for (const [pubkey, relays] of this.fetching) {
							const p = this.pending.get(pubkey);
							if (p) {
								const event = this.getEvent(pubkey) ?? null;
								p.resolve(event);
								if (!event) {
									failed++;
									for (const url of relays) this.failed.get(pubkey).add(url);
									p.reject();
								} else found++;
								this.pending.delete(pubkey);
							}
						}
						this.fetching.clear();

						this.emit('batch', found, failed);

						res();
					},
				});
			});

			// if there are pending requests, make another request
			if (this.next.size > 0) this.fetchEventsThrottle();
		}
	}

	getOrLoadEvent(pubkey: string, relays: string[] = []): Promise<NostrEvent | null> {
		// if its in the cache, return it
		const event = this.getEvent(pubkey);
		if (event) return Promise.resolve(event);

		// if its already being fetched, return promise
		const pending = this.pending.get(pubkey);
		if (pending) return pending;

		return this.loadEvent(pubkey, relays);
	}

	loadEvent(pubkey: string, relays: string[] = [], ignoreFailed = false): Promise<NostrEvent | null> {
		const urls = new Set(this.next.get(pubkey));

		// add relays
		for (const url of relays) urls.add(url);

		// add extra relays
		for (const url of this.extraRelays) urls.add(url);

		// filter out failed relays
		if (!ignoreFailed) {
			const failed = this.failed.get(pubkey);
			for (const url of failed) urls.delete(url);
		}

		if (urls.size === 0) {
			// nothing new to try return null
			return Promise.resolve(null);
		}

		// create a promise
		const defer = createDefer<NostrEvent | null>();
		this.pending.set(pubkey, defer);

		// add pubkey and relay to next queue
		this.next.set(pubkey, Array.from(urls));

		// trigger queue
		this.fetchEventsThrottle();
		return defer;
	}
}
