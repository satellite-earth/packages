import { NostrEvent, Relay } from 'nostr-tools';
import _throttle from 'lodash.throttle';
import { EventStore } from 'applesauce-core';

import SuperMap from '../classes/super-map';
import { logger } from '../helpers/debug';
import BatchKindLoader from '../classes/batch-kind-loader';
import RelaySet, { RelaySetFrom } from '../classes/relay-set';
import { eventStore } from './query-store';

export type RequestOptions = {
	/** Always request the event from the relays */
	alwaysRequest?: boolean;
	/** ignore the cache on initial load */
	ignoreCache?: boolean;
};

class ReplaceableEventsService {
	events: EventStore;

	private loaders = new SuperMap<Relay, BatchKindLoader>((relay) => {
		return new BatchKindLoader(this.events, relay, this.log.extend(relay.url));
	});

	private log = logger.extend('ReplaceableEventLoader');

	constructor(store: EventStore) {
		this.events = store;
	}

	handleEvent(event: NostrEvent) {
		this.events.add(event);
	}

	request(urls: RelaySetFrom, kind: number, pubkey: string, d?: string, opts: RequestOptions = {}) {
		const relays = RelaySet.from(urls);

		for (const relay of relays) this.loaders.get(relay).requestEvent(kind, pubkey, d);

		return this.events.getReplaceable(kind, pubkey, d);
	}
}

const replaceableEventsService = new ReplaceableEventsService(eventStore);

if (import.meta.env.DEV) {
	//@ts-ignore
	window.replaceableEventsService = replaceableEventsService;
}

export default replaceableEventsService;
