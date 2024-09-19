import { useEffect, useState } from 'react';
import { Filter } from 'nostr-tools';
import { nanoid } from 'nanoid';

import personalNode from '../services/personal-node';

export default function useEventCount(filters?: Filter[]) {
	const [count, setCount] = useState<number | undefined>();
	const [id] = useState(() => nanoid());

	useEffect(() => {
		setCount(undefined);
		if (!filters) return;

		personalNode?.count(filters, { id }).then((c) => setCount(c));
	}, [JSON.stringify(filters), id]);

	return count;
}
