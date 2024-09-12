import { NostrEvent, Relay } from 'nostr-tools';
import _throttle from 'lodash.throttle';
import { getEventCoordinate } from '@satellite-earth/core/helpers/nostr';

import SuperMap from '../classes/super-map';
import { logger } from '../helpers/debug';
import EventStore from '../classes/event-store';
import Subject from '../classes/subject';
import BatchKindLoader, { createCoordinate } from '../classes/batch-kind-loader';
import RelaySet, { RelaySetFrom } from '../classes/relay-set';

export type RequestOptions = {
	/** Always request the event from the relays */
	alwaysRequest?: boolean;
	/** ignore the cache on initial load */
	ignoreCache?: boolean;
};

class ReplaceableEventsService {
	private subjects = new SuperMap<string, Subject<NostrEvent>>(() => new Subject<NostrEvent>());
	private loaders = new SuperMap<Relay, BatchKindLoader>((relay) => {
		const loader = new BatchKindLoader(relay, this.log.extend(relay.url));
		loader.events.onEvent.subscribe((e) => this.handleEvent(e));
		return loader;
	});

	events = new EventStore();

	log = logger.extend('ReplaceableEventLoader');

	handleEvent(event: NostrEvent, _saveToCache = true) {
		const cord = getEventCoordinate(event);

		const subject = this.subjects.get(cord);
		const current = subject.value;
		if (!current || event.created_at > current.created_at) {
			subject.next(event);
			this.events.addEvent(event);
		}
	}

	getEvent(kind: number, pubkey: string, d?: string) {
		return this.subjects.get(createCoordinate(kind, pubkey, d));
	}

	private requestEventFromRelays(urls: RelaySetFrom, kind: number, pubkey: string, d?: string) {
		const cord = createCoordinate(kind, pubkey, d);
		const relays = RelaySet.from(urls);
		const sub = this.subjects.get(cord);

		for (const relay of relays) this.loaders.get(relay).requestEvent(kind, pubkey, d);

		return sub;
	}

	requestEvent(urls: RelaySetFrom, kind: number, pubkey: string, d?: string, opts: RequestOptions = {}) {
		const key = createCoordinate(kind, pubkey, d);
		const sub = this.subjects.get(key);
		const relays = RelaySet.from(urls);

		// if (!sub.value && privateNode) {
		//   privateNode.requestEvent(kind, pubkey, d).then((loaded) => {
		//     if (!loaded && !sub.value) this.requestEventFromRelays(urls, kind, pubkey, d);
		//   });
		// }

		// if (opts?.alwaysRequest || !this.cacheLoader || (!sub.value && opts.ignoreCache)) {
		this.requestEventFromRelays(relays, kind, pubkey, d);
		// }

		return sub;
	}
}

const replaceableEventsService = new ReplaceableEventsService();

if (import.meta.env.DEV) {
	//@ts-ignore
	window.replaceableEventsService = replaceableEventsService;
}

export default replaceableEventsService;
