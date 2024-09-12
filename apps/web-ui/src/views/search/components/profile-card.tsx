import { Card, CardBody, CardHeader, Flex, LinkBox } from '@chakra-ui/react';
import { nip19, NostrEvent } from 'nostr-tools';
import { Link as RouterLink } from 'react-router-dom';

import UserAvatar from '../../../components/user/user-avatar';
import HoverLinkOverlay from '../../../components/hover-link-overlay';
import UserName from '../../../components/user/user-name';
import UserAbout from '../../../components/user/user-about';
import UserDnsIdentity from '../../../components/user/user-dns-identity';

export default function ProfileCard({ profile }: { profile: NostrEvent }) {
	return (
		<Card as={LinkBox} direction="column" maxW="xs" minW="8rem" flexShrink={0} rounded="md" overflow="hidden">
			<CardHeader display="flex" gap="4">
				<UserAvatar pubkey={profile.pubkey} />
				<Flex direction="column">
					<HoverLinkOverlay as={RouterLink} to={`/profile/${nip19.npubEncode(profile.pubkey)}`} isTruncated>
						<UserName pubkey={profile.pubkey} />
					</HoverLinkOverlay>
					<UserDnsIdentity pubkey={profile.pubkey} />
				</Flex>
			</CardHeader>
			<CardBody pt="0">
				<UserAbout pubkey={profile.pubkey} noOfLines={2} />
			</CardBody>
		</Card>
	);
}
