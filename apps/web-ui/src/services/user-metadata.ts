import { Kind0ParsedContent, parseKind0Event } from '@satellite-earth/core/helpers/nostr';
import { kinds, NostrEvent } from 'nostr-tools';
import _throttle from 'lodash.throttle';

import SuperMap from '../classes/super-map';
import Subject from '../classes/subject';
import replaceableEventsService, { RequestOptions } from './replaceable-events';
import { RelaySetFrom } from '../classes/relay-set';

class UserMetadataService {
	private metadata = new SuperMap<string, Subject<Kind0ParsedContent>>((pubkey) => {
		return replaceableEventsService.getEvent(0, pubkey).map(parseKind0Event);
	});
	getSubject(pubkey: string) {
		return this.metadata.get(pubkey);
	}
	requestMetadata(pubkey: string, relays: RelaySetFrom, opts: RequestOptions = {}) {
		const subject = this.metadata.get(pubkey);
		replaceableEventsService.requestEvent(relays, kinds.Metadata, pubkey, undefined, opts);
		return subject;
	}
	handleEvent(event: NostrEvent) {
		replaceableEventsService.handleEvent(event);
		return this.getSubject(event.pubkey);
	}
}

const userMetadataService = new UserMetadataService();

if (import.meta.env.DEV) {
	// @ts-ignore
	window.userMetadataService = userMetadataService;
}

export default userMetadataService;
