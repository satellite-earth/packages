import { NostrEvent } from 'nostr-tools';

import Subject, { PersistentSubject } from '../classes/subject';

class CommunitiesService {
	communities = new PersistentSubject<NostrEvent[]>([]);

	community = new Subject<NostrEvent>();

	constructor() {
		this.communities.subscribe((v) => localStorage.setItem('communities', JSON.stringify(v)));

		const cached = localStorage.getItem('communities');
		if (cached) {
			try {
				const arr = JSON.parse(cached);
				this.communities.next(arr.filter((e: string | NostrEvent) => typeof e === 'object'));
			} catch (e) {}
		}
	}

	addCommunity(community: NostrEvent) {
		this.communities.next([...this.communities.value, community]);
	}

	switch(pubkey: string) {
		const community = this.communities.value.find((e) => e.pubkey === pubkey);
		if (!community) return;

		this.community.next(community);
	}
}

const communitiesService = new CommunitiesService();

if (import.meta.env.DEV) {
	// @ts-expect-error
	window.communitiesService = communitiesService;
}

export default communitiesService;
