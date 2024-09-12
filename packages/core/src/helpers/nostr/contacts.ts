import { NostrEvent } from 'nostr-tools';
import { safeRelayUrl } from './relays.js';

export function getRelaysFromContactList(event: NostrEvent) {
	try {
		const json = JSON.parse(event.content) as Record<string, { write?: boolean; read?: boolean }>;
		const relays: { url: string; write?: boolean; read?: boolean }[] = [];

		for (const [url, value] of Object.entries(json)) {
			const safeUrl = safeRelayUrl(url);
			if (safeUrl) {
				relays.push({ url: safeUrl, write: value.write, read: value.read });
			}
		}

		return relays;
	} catch (error) {
		return null;
	}
}
