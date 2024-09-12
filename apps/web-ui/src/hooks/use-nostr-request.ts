import { useEffect, useState } from 'react';
import { Filter, NostrEvent } from 'nostr-tools';

import personalNode from '../services/personal-node';

export default function useNostrRequest(filters?: Filter[]) {
	const [events, setEvents] = useState<NostrEvent[]>([]);

	useEffect(() => {
		if (!filters) {
			setEvents([]);
			return;
		}

		setEvents([]);
		const sub = personalNode?.subscribe(filters, {
			onevent: (event) => setEvents((arr) => [...arr, event]),
		});

		return () => sub?.close();
	}, [JSON.stringify(filters)]);

	return events;
}
