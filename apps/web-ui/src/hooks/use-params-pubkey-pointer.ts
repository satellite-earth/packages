import { useParams } from 'react-router-dom';
import { nip19 } from 'nostr-tools';
import { isHexKey } from 'applesauce-core/helpers';

export default function useParamsProfilePointer(key: string = 'pubkey'): nip19.ProfilePointer {
	const params = useParams();
	const value = params[key] as string;
	if (!value) throw new Error(`Missing ${key} in route`);

	if (isHexKey(value)) return { pubkey: value, relays: [] };
	const pointer = nip19.decode(value);

	switch (pointer.type) {
		case 'npub':
			return { pubkey: pointer.data as string, relays: [] };
		case 'nprofile':
			return pointer.data;
		default:
			throw new Error(`Unknown type ${pointer.type}`);
	}
}
