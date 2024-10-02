import { useParams } from 'react-router-dom';
import { nip19 } from 'nostr-tools';
import { isHexKey } from 'applesauce-core/helpers';

export default function useParamsEventPointer(key: string): nip19.EventPointer {
	const params = useParams();
	const value = params[key] as string;
	if (!value) throw new Error(`Missing ${key} in route`);

	if (isHexKey(value)) return { id: value, relays: [] };
	const pointer = nip19.decode(value as string);

	switch (pointer.type) {
		case 'note':
			return { id: pointer.data as string, relays: [] };
		case 'nevent':
			return pointer.data;
		default:
			throw new Error(`Unknown type ${pointer.type}`);
	}
}
