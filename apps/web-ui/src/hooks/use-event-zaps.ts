import { useMemo } from 'react';

import eventZapsService from '../services/event-zaps';
import useSubject from './use-subject';
import { parseZapEvent } from '../helpers/nostr/zaps';
import { RelaySetFrom } from '../classes/relay-set';

export default function useEventZaps(eventUID: string, relays: RelaySetFrom, alwaysRequest = true) {
	const subject = useMemo(
		() => eventZapsService.requestZaps(eventUID, relays, alwaysRequest),
		[eventUID, relays, alwaysRequest],
	);

	const events = useSubject(subject) || [];

	const zaps = useMemo(() => {
		const parsed = [];
		for (const zap of events) {
			try {
				parsed.push(parseZapEvent(zap));
			} catch (e) {}
		}
		return parsed;
	}, [events]);

	return zaps;
}
