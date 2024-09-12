import { useParams } from 'react-router-dom';
import { nip19 } from 'nostr-tools';
import { CustomAddressPointer, parseCoordinate } from '@satellite-earth/core/helpers/nostr';

export default function useParamsAddressPointer(key: string): nip19.AddressPointer;
export default function useParamsAddressPointer(key: string, requireD: true): nip19.AddressPointer;
export default function useParamsAddressPointer(key: string, requireD: false): CustomAddressPointer;
export default function useParamsAddressPointer(key: string, requireD: boolean = true): nip19.AddressPointer {
	const params = useParams();
	const value = params[key] as string;
	if (!value) throw new Error(`Missing ${key} in route`);

	if (value.includes(':')) {
		if (requireD) {
			return parseCoordinate(value, true, false);
		} else {
			// @ts-ignore
			return parseCoordinate(value, false, false);
		}
	}

	// its not a coordinate, try to parse the nip19
	const pointer = nip19.decode(value as string);

	switch (pointer.type) {
		case 'naddr':
			return pointer.data;
		default:
			throw new Error(`Unknown type ${pointer.type}`);
	}
}
