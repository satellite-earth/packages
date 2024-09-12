import { NostrEvent, kinds } from 'nostr-tools';

import ControlledObservable from '../classes/controlled-observable';
import communityRelaysService from './community-relays';
import PersistentSubscription from '../classes/persistent-subscription';

class CommunityDeleteStreams {
	streams = new Map<string, ControlledObservable<NostrEvent>>();
	subscriptions = new Map<string, PersistentSubscription>();

	getStream(pubkey: string) {
		let stream = this.streams.get(pubkey);
		if (stream) return stream;

		stream = new ControlledObservable<NostrEvent>();

		const sub = new PersistentSubscription(communityRelaysService.getRelay(pubkey), {
			onevent: (event) => stream.next(event),
		});
		sub.filters = [{ kinds: [kinds.EventDeletion], limit: 10 }];
		sub.update();

		this.streams.set(pubkey, stream);
		this.subscriptions.set(pubkey, sub);
		return stream;
	}

	closeStream(pubkey: string) {
		this.streams.delete(pubkey);
		const sub = this.subscriptions.get(pubkey);
		if (sub) sub.close();
		this.subscriptions.delete(pubkey);
	}
}

const communityDeleteStreams = new CommunityDeleteStreams();

if (import.meta.env.DEV) {
	// @ts-expect-error
	window.communityDeleteStreams = communityDeleteStreams;
}

export default communityDeleteStreams;
