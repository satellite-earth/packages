import { useEffect } from 'react';
import { Queries } from 'applesauce-core';
import { useStoreQuery } from 'applesauce-react';

import { useWithLocalRelay } from './use-client-relays';
import replaceableEventsService, { RequestOptions } from '../services/replaceable-events';
import { RelaySetFrom } from '../classes/relay-set';

export default function useReplaceableEvent(
	cord:
		| {
				kind: number;
				pubkey: string;
				identifier?: string;
				relays?: string[];
		  }
		| undefined,
	additionalRelays?: RelaySetFrom,
	opts: RequestOptions = {},
) {
	const readRelays = useWithLocalRelay(additionalRelays);

	useEffect(() => {
		if (!cord) return;

		replaceableEventsService.request(
			cord.relays ? [...readRelays, ...cord.relays] : readRelays,
			cord.kind,
			cord.pubkey,
			cord.identifier,
			opts,
		);
	}, [cord, readRelays, opts?.alwaysRequest, opts?.ignoreCache]);

	return useStoreQuery(Queries.ReplaceableQuery, cord ? [cord.kind, cord.pubkey, cord.identifier] : undefined);
}
