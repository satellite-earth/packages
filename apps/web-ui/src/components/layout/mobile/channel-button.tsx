import { Box, Flex, Heading, Image, LinkBox, Text } from '@chakra-ui/react';
import { getChannelAbout, getChannelId, getChannelName, getChannelPicture } from '@satellite-earth/core/helpers/nostr';
import { Link as RouterLink } from 'react-router-dom';
import { NostrEvent } from 'nostr-tools';

import HoverLinkOverlay from '../../hover-link-overlay';

export default function ChannelButton({ channel }: { channel: NostrEvent }) {
	const name = getChannelName(channel);
	const about = getChannelAbout(channel);
	const picture = getChannelPicture(channel);

	return (
		<Flex as={LinkBox} p="2" gap="2">
			{picture ? <Image src={picture} w="12" h="12" borderRadius="xl" /> : <Box />}
			<Flex direction="column">
				<Heading as="h4" size="md">
					<HoverLinkOverlay as={RouterLink} to={`/g/${getChannelId(channel)}`}>
						{name}
					</HoverLinkOverlay>
				</Heading>
				<Text color="GrayText" noOfLines={1}>
					{about}
				</Text>
			</Flex>
		</Flex>
	);
}
