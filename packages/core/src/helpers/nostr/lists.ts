import { EventTemplate, nip19, NostrEvent } from 'nostr-tools';
import { parseCoordinate } from './event.js';

function unixNow() {
	return Math.round(Date.now() / 1000);
}

export function getPubkeysFromList(event: NostrEvent | EventTemplate) {
	return event.tags.filter((t) => t[0] === 'p' && t[1]).map((t) => ({ pubkey: t[1], relay: t[2], petname: t[3] }));
}
export function getEventPointersFromList(event: NostrEvent | EventTemplate): nip19.EventPointer[] {
	return event.tags
		.filter((t) => t[0] === 'e' && t[1])
		.map((t) => (t[2] ? { id: t[1], relays: [t[2]] } : { id: t[1] }));
}
export function getCoordinatesFromList(event: NostrEvent | EventTemplate) {
	return event.tags.filter((t) => t[0] === 'a' && t[1] && t[2]).map((t) => ({ coordinate: t[1], relay: t[2] }));
}
export function getAddressPointersFromList(event: NostrEvent | EventTemplate): nip19.AddressPointer[] {
	const pointers: nip19.AddressPointer[] = [];

	for (const tag of event.tags) {
		if (!tag[1]) continue;
		const relay = tag[2];
		const parsed = parseCoordinate(tag[1]);
		if (!parsed?.identifier) continue;

		pointers.push({ ...parsed, identifier: parsed?.identifier, relays: relay ? [relay] : undefined });
	}

	return pointers;
}

export function isPubkeyInList(list?: NostrEvent, pubkey?: string) {
	if (!pubkey || !list) return false;
	return list.tags.some((t) => t[0] === 'p' && t[1] === pubkey);
}

export function listAddPerson(
	list: NostrEvent | EventTemplate,
	pubkey: string,
	relay?: string,
	petname?: string,
): EventTemplate {
	if (list.tags.some((t) => t[0] === 'p' && t[1] === pubkey)) throw new Error('Person already in list');
	const pTag = ['p', pubkey, relay ?? '', petname ?? ''];
	while (pTag[pTag.length - 1] === '') pTag.pop();

	return {
		created_at: unixNow(),
		kind: list.kind,
		content: list.content,
		tags: [...list.tags, pTag],
	};
}

export function listRemovePerson(list: NostrEvent | EventTemplate, pubkey: string): EventTemplate {
	return {
		created_at: unixNow(),
		kind: list.kind,
		content: list.content,
		tags: list.tags.filter((t) => !(t[0] === 'p' && t[1] === pubkey)),
	};
}

export function listAddEvent(list: NostrEvent | EventTemplate, event: string, relay?: string): EventTemplate {
	if (list.tags.some((t) => t[0] === 'e' && t[1] === event)) throw new Error('Event already in list');

	return {
		created_at: unixNow(),
		kind: list.kind,
		content: list.content,
		tags: [...list.tags, relay ? ['e', event, relay] : ['e', event]],
	};
}

export function listRemoveEvent(list: NostrEvent | EventTemplate, event: string): EventTemplate {
	return {
		created_at: unixNow(),
		kind: list.kind,
		content: list.content,
		tags: list.tags.filter((t) => !(t[0] === 'e' && t[1] === event)),
	};
}

export function listAddCoordinate(list: NostrEvent | EventTemplate, coordinate: string, relay?: string): EventTemplate {
	if (list.tags.some((t) => t[0] === 'a' && t[1] === coordinate)) throw new Error('Event already in list');

	return {
		created_at: unixNow(),
		kind: list.kind,
		content: list.content,
		tags: [...list.tags, relay ? ['a', coordinate, relay] : ['a', coordinate]],
	};
}

export function listRemoveCoordinate(list: NostrEvent | EventTemplate, coordinate: string): EventTemplate {
	return {
		created_at: unixNow(),
		kind: list.kind,
		content: list.content,
		tags: list.tags.filter((t) => !(t[0] === 'a' && t[1] === coordinate)),
	};
}
