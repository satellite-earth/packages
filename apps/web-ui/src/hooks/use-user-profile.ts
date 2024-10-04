import { useEffect } from 'react';
import { Queries } from 'applesauce-core';
import { useStoreQuery } from 'applesauce-react';
import { kinds } from 'nostr-tools';

import replaceableEventsService, { RequestOptions } from '../services/replaceable-events';
import { useWithLocalRelay } from './use-client-relays';

export default function useUserMetadata(
	pubkey?: string,
	additionalRelays: Iterable<string> = [],
	opts: RequestOptions = {},
) {
	const relays = useWithLocalRelay(additionalRelays);

	useEffect(() => {
		if (pubkey) replaceableEventsService.request(relays, kinds.Metadata, pubkey, undefined, opts);
	}, [pubkey, relays]);

	return useStoreQuery(Queries.ProfileQuery, pubkey ? [pubkey] : undefined);
}
