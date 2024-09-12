import { NostrEvent } from 'nostr-tools';
import { IconButton, Image } from '@chakra-ui/react';
import { getCommunityImage, getCommunityName } from '@satellite-earth/core/helpers/nostr';

import useSubject from '../../../hooks/use-subject';
import communitiesService from '../../../services/communities';
import timelineCacheService from '../../../services/timeline-cache';

export default function CommunityButton({ community }: { community: NostrEvent }) {
	const selected = useSubject(communitiesService.community);

	const select = () => {
		timelineCacheService.clear();
		communitiesService.switch(community.pubkey);
	};

	const name = community && getCommunityName(community);
	const image = community && getCommunityImage(community);

	return (
		<IconButton
			aria-label={name || 'community'}
			title={name}
			icon={image ? <Image borderRadius="lg" src={image} w="10" h="10" /> : undefined}
			onClick={select}
			h="12"
			w="12"
			colorScheme={selected?.pubkey === community.pubkey ? 'brand' : undefined}
			variant="outline"
		/>
	);
}
