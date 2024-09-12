import { Relay, NostrEvent, kinds } from 'nostr-tools';
import _throttle from 'lodash.throttle';

import Subject from '../classes/subject';
import SuperMap from '../classes/super-map';
import BatchRelationLoader from '../classes/batch-relation-loader';
import { logger } from '../helpers/debug';
import RelaySet, { RelaySetFrom } from '../classes/relay-set';

class EventZapsService {
	log = logger.extend('EventZapsService');

	subjects = new SuperMap<string, Subject<NostrEvent[]>>(() => new Subject<NostrEvent[]>([]));

	loaders = new SuperMap<Relay, BatchRelationLoader>((relay) => {
		const loader = new BatchRelationLoader(relay, [kinds.Zap], this.log.extend(relay.url));
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

	requestZaps(eventUID: string, urls: RelaySetFrom, alwaysRequest = true) {
		const subject = this.subjects.get(eventUID);
		if (subject.value && !alwaysRequest) return subject;

		const relays = RelaySet.from(urls);
		for (const relay of relays) {
			this.loaders.get(relay).requestEvents(eventUID);
		}

		return subject;
	}
}

const eventZapsService = new EventZapsService();

if (import.meta.env.DEV) {
	// @ts-ignore
	window.eventZapsService = eventZapsService;
}

export default eventZapsService;
