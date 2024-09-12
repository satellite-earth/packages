import { NostrEvent } from 'nostr-tools';
import { Flex, Image, Text } from '@chakra-ui/react';
import { getCommunityImage, getCommunityName } from '@satellite-earth/core/helpers/nostr';

import useSubject from '../../../hooks/use-subject';
import timelineCacheService from '../../../services/timeline-cache';
import communitiesService from '../../../services/communities';

export default function MobileCommunityButton({ community }: { community: NostrEvent }) {
	const selected = useSubject(communitiesService.community);

	const select = () => {
		timelineCacheService.clear();
		communitiesService.switch(community.pubkey);
	};

	const name = community && getCommunityName(community);
	const image = community && getCommunityImage(community);

	return (
		<Flex onClick={select} alignItems="center" p="2" gap="4" tabIndex={0} cursor="pointer">
			<Image borderRadius="xl" src={image} w="10" h="10" />
			<Text fontWeight="bold">{name}</Text>
		</Flex>
	);
}
