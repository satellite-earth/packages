import { useMemo } from 'react';

import { useWithLocalRelay } from './use-client-relays';
import replaceableEventsService, { RequestOptions } from '../services/replaceable-events';
import useSubject from './use-subject';
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

	const sub = useMemo(() => {
		if (!cord) return;
		return replaceableEventsService.requestEvent(
			cord.relays ? [...readRelays, ...cord.relays] : readRelays,
			cord.kind,
			cord.pubkey,
			cord.identifier,
			opts,
		);
	}, [cord, readRelays, opts?.alwaysRequest, opts?.ignoreCache]);

	return useSubject(sub);
}
