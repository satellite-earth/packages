import { Flex, FlexProps, LinkBox } from '@chakra-ui/react';
import { Link as RouterLink } from 'react-router-dom';
import { nip19 } from 'nostr-tools';

import UserName from '../../../components/user/user-name';
import UserAvatar from '../../../components/user/user-avatar';
import HoverLinkOverlay from '../../../components/hover-link-overlay';

export default function OverviewItem({
	pubkey,
	events,
	...props
}: Omit<FlexProps, 'children'> & { pubkey: string; events: number }) {
	return (
		<Flex as={LinkBox} justifyContent="space-between" alignItems="center" py="2" px="4" {...props}>
			<Flex alignItems="center" gap="3">
				<UserAvatar pubkey={pubkey} />
				<HoverLinkOverlay as={RouterLink} to={`/profile/${nip19.npubEncode(pubkey)}`}>
					<UserName pubkey={pubkey} />
				</HoverLinkOverlay>
			</Flex>
			<div>{events} events</div>
		</Flex>
	);
}
