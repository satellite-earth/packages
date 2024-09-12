import { useEffect, useMemo } from 'react';
import { Filter, NostrEvent } from 'nostr-tools';

import timelineCacheService from '../services/timeline-cache';
import { EventFilter } from '../classes/timeline-loader';
import { stringifyFilter } from '../helpers/nostr/filter';
import { useCommunityContext } from '../providers/local/community-provider';
import communityDeleteStreams from '../services/delete-events';
import RelaySet, { RelaySetFrom } from '../classes/relay-set';

type Options = {
	eventFilter?: EventFilter;
	cursor?: number;
};

export default function useTimelineLoader(
	key: string,
	filters: Filter[] | undefined,
	relays?: RelaySetFrom,
	opts?: Options,
) {
	const timeline = useMemo(() => timelineCacheService.createTimeline(key), [key]);
	const community = useCommunityContext();

	useEffect(() => {
		if (filters && relays) {
			timeline.setRelays(RelaySet.from(relays));
			timeline.setFilters(filters);

			// if this timeline is in the context of a community, subscribe to the delete stream
			if (community) {
				const deleteStream = communityDeleteStreams.getStream(community.community.pubkey);
				const extraCheck = (event: NostrEvent) => event.pubkey === community.community.pubkey;
				timeline.setDeleteStream(deleteStream, extraCheck);
			}

			timeline.open();
		} else timeline.close();
	}, [timeline, filters && stringifyFilter(filters), relays, community]);

	// update event filter
	useEffect(() => {
		timeline.setEventFilter(opts?.eventFilter);
	}, [timeline, opts?.eventFilter]);

	// update cursor
	useEffect(() => {
		if (opts?.cursor !== undefined) {
			timeline.setCursor(opts.cursor);
		}
	}, [timeline, opts?.cursor]);

	return timeline;
}
