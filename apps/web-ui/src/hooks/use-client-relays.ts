import { useMemo } from 'react';

import personalNode from '../services/personal-node';
import RelaySet, { RelaySetFrom } from '../classes/relay-set';

export function useWithLocalRelay(additional?: RelaySetFrom) {
	return useMemo(() => {
		const set = RelaySet.from(additional);
		if (personalNode) set.add(personalNode);
		return set;
	}, [additional]);
}
