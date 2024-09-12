import { NostrEvent, kinds, nip19 } from 'nostr-tools';

export function isReplaceable(kind: number) {
	return kinds.isReplaceableKind(kind) || kinds.isParameterizedReplaceableKind(kind);
}

export function sortByDate(a: NostrEvent, b: NostrEvent) {
	return b.created_at - a.created_at;
}

export function getEventCoordinate(event: NostrEvent) {
	const d = event.tags.find((t) => t[0] === 'd')?.[1];
	return d ? `${event.kind}:${event.pubkey}:${d}` : `${event.kind}:${event.pubkey}`;
}

export function getTagValue(event: NostrEvent, tag: string) {
	return event.tags.find((t) => t[0] === tag)?.[1];
}

export function doesEventMatchCoordinate(event: NostrEvent, coordinate: string) {
	const [kind, pubkey, d] = coordinate.split(':');
	if (!kind || !pubkey || !d) return false;
	return (
		event.kind === parseInt(kind) && event.pubkey === event.pubkey && event.tags.find((t) => t[0] === 'd')?.[1] === d
	);
}

export type CustomAddressPointer = Omit<nip19.AddressPointer, 'identifier'> & {
	identifier?: string;
};

export function parseCoordinate(a: string): CustomAddressPointer | null;
export function parseCoordinate(a: string, requireD: false): CustomAddressPointer | null;
export function parseCoordinate(a: string, requireD: true): nip19.AddressPointer | null;
export function parseCoordinate(a: string, requireD: false, silent: false): CustomAddressPointer;
export function parseCoordinate(a: string, requireD: true, silent: false): nip19.AddressPointer;
export function parseCoordinate(a: string, requireD: true, silent: true): nip19.AddressPointer | null;
export function parseCoordinate(a: string, requireD: false, silent: true): CustomAddressPointer | null;
export function parseCoordinate(a: string, requireD = false, silent = true): CustomAddressPointer | null {
	const parts = a.split(':') as (string | undefined)[];
	const kind = parts[0] && parseInt(parts[0]);
	const pubkey = parts[1];
	const d = parts[2];

	if (!kind) {
		if (silent) return null;
		else throw new Error('Missing kind');
	}
	if (!pubkey) {
		if (silent) return null;
		else throw new Error('Missing pubkey');
	}
	if (requireD && d === undefined) {
		if (silent) return null;
		else throw new Error('Missing identifier');
	}

	return {
		kind,
		pubkey,
		identifier: d,
	};
}
