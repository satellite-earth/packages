import { NostrEvent } from 'nostr-tools';
import { safeRelayUrls } from './relays.js';

// inbox relays can be ["r", <url>, "read"] or ["r", <url>]
export function getInboxes(event?: NostrEvent | null, fallback?: string[]) {
	const tags = event ? event.tags.filter((t) => (t[0] === 'r' && t[2] === 'read') || t[2] === undefined) : [];
	const urls = safeRelayUrls(tags.map((t) => t[1]));
	if (fallback && urls.length === 0) return fallback;
	return urls;
}

export function getOutboxes(event?: NostrEvent | null, fallback?: string[]) {
	const tags = event ? event.tags.filter((t) => (t[0] === 'r' && t[2] === 'write') || t[2] === undefined) : [];
	const urls = safeRelayUrls(tags.map((t) => t[1]));
	if (fallback && urls.length === 0) return fallback;
	return urls;
}
