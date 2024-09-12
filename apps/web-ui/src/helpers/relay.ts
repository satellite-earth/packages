export function validateRelayURL(relay: string | URL) {
	if (typeof relay === 'string' && relay.includes(',ws')) throw new Error('Can not have multiple relays in one string');
	const url = typeof relay === 'string' ? new URL(relay) : relay;
	if (url.protocol !== 'wss:' && url.protocol !== 'ws:') throw new Error('Incorrect protocol');
	return url;
}

export function safeRelayUrl(relayUrl: string | URL) {
	try {
		return validateRelayURL(relayUrl).toString();
	} catch (e) {
		return null;
	}
}
export function safeRelayUrls(urls: Iterable<string>): string[] {
	return Array.from(urls).map(safeRelayUrl).filter(Boolean) as string[];
}
