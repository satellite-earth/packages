import { useRef } from 'react';
import { getEventUID } from 'nostr-idb';
import { NostrEvent } from 'nostr-tools';

import { useRegisterIntersectionEntity } from '../providers/local/intersection-observer';

export default function useEventIntersectionRef(event: NostrEvent) {
	const ref = useRef<HTMLDivElement | null>(null);
	useRegisterIntersectionEntity(ref, getEventUID(event));
	return ref;
}
