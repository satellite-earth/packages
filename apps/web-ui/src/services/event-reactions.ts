import { NostrEvent, kinds } from 'nostr-tools';
import _throttle from 'lodash.throttle';
import { AbstractRelay } from 'nostr-tools/abstract-relay';

import Subject from '../classes/subject';
import SuperMap from '../classes/super-map';
import relayPoolService from './relay-pool';
import BatchRelationLoader from '../classes/batch-relation-loader';
import { logger } from '../helpers/debug';

class EventReactionsService {
	log = logger.extend('EventReactionsService');

	subjects = new SuperMap<string, Subject<NostrEvent[]>>(() => new Subject<NostrEvent[]>([]));

	loaders = new SuperMap<AbstractRelay, BatchRelationLoader>((relay) => {
		const loader = new BatchRelationLoader(relay, [kinds.Reaction], this.log.extend(relay.url));
		loader.onEventUpdate.subscribe((id) => {
			this.updateSubject(id);
		});
		return loader;
	});

	// merged results from all loaders for a single event
	private updateSubject(id: string) {
		const ids = new Set<string>();
		const events: NostrEvent[] = [];
		const subject = this.subjects.get(id);

		for (const [relay, loader] of this.loaders) {
			if (loader.references.has(id)) {
				const other = loader.references.get(id);
				for (const [_, e] of other) {
					if (!ids.has(e.id)) {
						ids.add(e.id);
						events.push(e);
					}
				}
			}
		}

		subject.next(events);
	}

	requestReactions(eventUID: string, urls: Iterable<string | URL | AbstractRelay>, alwaysRequest = true) {
		const subject = this.subjects.get(eventUID);
		if (subject.value && !alwaysRequest) return subject;

		const relays = relayPoolService.getRelays(urls);
		for (const relay of relays) {
			this.loaders.get(relay).requestEvents(eventUID);
		}

		return subject;
	}

	handleEvent() {}
}

const eventReactionsService = new EventReactionsService();

if (import.meta.env.DEV) {
	// @ts-ignore
	window.eventReactionsService = eventReactionsService;
}

export default eventReactionsService;
