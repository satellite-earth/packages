import { NostrEvent } from 'nostr-tools';

export function getTagValue(event: NostrEvent, tag: string) {
	return event.tags.find((t) => t[0] === tag)?.[1];
}
