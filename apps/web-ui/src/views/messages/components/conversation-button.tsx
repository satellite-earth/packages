import { Flex, FlexProps, LinkBox, Text } from '@chakra-ui/react';
import { Link as RouterLink, useLocation } from 'react-router-dom';
import { CheckIcon } from '@chakra-ui/icons';
import { nip19 } from 'nostr-tools';

import Timestamp from '../../../components/timestamp';
import UserName from '../../../components/user/user-name';
import UserAvatar from '../../../components/user/user-avatar';
import UserDnsIdentity from '../../../components/user/user-dns-identity';
import HoverLinkOverlay from '../../../components/hover-link-overlay';
import { useDraft } from '../../../hooks/use-cache-form';

export default function ConversationButton({
	pubkey,
	lastSent,
	lastReceived,
	...props
}: {
	pubkey: string;
	lastSent?: number;
	lastReceived?: number;
} & Omit<FlexProps, 'children'>) {
	const location = useLocation();

	const draft = useDraft(pubkey);
	const lastMessage = Math.max(lastSent ?? 0, lastReceived ?? 0);

	return (
		<LinkBox as={Flex} gap="2" overflow="hidden" p="2" flexShrink={0} {...props}>
			<UserAvatar pubkey={pubkey} />
			<Flex direction="column" gap="1" overflow="hidden" flex={1}>
				<Flex gap="2" alignItems="center" overflow="hidden">
					<HoverLinkOverlay as={RouterLink} to={`/messages/p/${nip19.npubEncode(pubkey)}` + location.search} mr="auto">
						<UserName pubkey={pubkey} isTruncated />
					</HoverLinkOverlay>
					{!!draft && (
						<Text color="blue.500" fontWeight="bold">
							Draft
						</Text>
					)}
					{lastSent && lastReceived && lastSent > lastReceived && <CheckIcon boxSize={4} color="green.500" />}
					{lastMessage && <Timestamp flexShrink={0} timestamp={lastMessage} />}
				</Flex>
				<UserDnsIdentity pubkey={pubkey} />
			</Flex>
		</LinkBox>
	);
}
