import { nip19, NostrEvent } from 'nostr-tools';
import { isReplaceable } from './event.js';

export function getSharableEventAddress(event: NostrEvent, relays?: Iterable<string>) {
	if (isReplaceable(event.kind)) {
		const d = event.tags.find((t) => t[0] === 'd' && t[1])?.[1];
		if (!d) return null;
		return nip19.naddrEncode({
			kind: event.kind,
			identifier: d,
			pubkey: event.pubkey,
			relays: relays && Array.from(relays),
		});
	} else {
		return nip19.neventEncode({
			id: event.id,
			kind: event.kind,
			relays: relays && Array.from(relays),
			author: event.pubkey,
		});
	}
}
