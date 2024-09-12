import { useState } from 'react';
import { Box, Button, Flex, Heading, IconButton, Image, useDisclosure } from '@chakra-ui/react';
import {
	getChannelId,
	getChannelName,
	getChannelPicture,
	getCommunityBanner,
	getCommunityName,
} from '@satellite-earth/core/helpers/nostr';
import { Link as RouterLink } from 'react-router-dom';
import { NostrEvent } from 'nostr-tools';

import accountService from '../../../services/account';
import useCurrentAccount from '../../../hooks/use-current-account';
import UserAvatar from '../../user/user-avatar';
import UserName from '../../user/user-name';
import Plus from '../../icons/components/plus';
import CreateGroupModal from '../../channel/create-channel-modal';
import Edit01 from '../../icons/components/edit-01';
import EditChannelModal from '../../channel/edit-channel-modal';
import { useCurrentCommunity } from '../../../providers/local/community-provider';
import useCommunityChannels from '../../../hooks/use-community-channels';

export default function DesktopChannelNav() {
	const account = useCurrentAccount();
	const createGroupModal = useDisclosure();
	const { community, relay } = useCurrentCommunity();

	const [editChannel, setEditChannel] = useState<NostrEvent>();
	const { channels } = useCommunityChannels(community, relay);

	return (
		<Flex direction="column" gap="2" px="2" py="2" shrink={0} w="xs" borderRightWidth={1}>
			{community && (
				<Box as={RouterLink} to="/" borderRadius="lg" bg="black" overflow="hidden">
					{getCommunityBanner(community) ? (
						<Image
							src={getCommunityBanner(community) || 'https://satellite.earth/assets/branding-94b401c7.png'}
							w="full"
						/>
					) : (
						<Heading color="white" mx="4" my="1em" textAlign="center" lineHeight={0} whiteSpace="nowrap">
							{getCommunityName(community)}
						</Heading>
					)}
				</Box>
			)}
			{account ? (
				<Flex gap="2" alignItems="center">
					<UserAvatar size="sm" pubkey={account.pubkey} />
					<UserName pubkey={account.pubkey} />
					<Button size="sm" onClick={() => accountService.logout()} ml="auto">
						Logout
					</Button>
				</Flex>
			) : (
				<Button as={RouterLink} to="/login" colorScheme="brand" size="sm">
					Login
				</Button>
			)}
			<Flex gap="2" alignItems="center">
				<Heading size="sm">Chat Channels</Heading>
				<IconButton
					icon={<Plus boxSize={5} />}
					aria-label="New Group"
					size="sm"
					ml="auto"
					variant="ghost"
					onClick={createGroupModal.onOpen}
				/>
			</Flex>
			{channels.map((channel) => (
				<Flex gap="1" key={channel.id}>
					<Button
						as={RouterLink}
						to={`/g/${getChannelId(channel)}`}
						size="sm"
						justifyContent="flex-start"
						variant="ghost"
						flex={1}
						leftIcon={getChannelPicture(channel) ? <Image w="5" h="5" src={getChannelPicture(channel)} /> : undefined}
					>
						{getChannelName(channel)}
					</Button>
					<IconButton
						icon={<Edit01 />}
						aria-label="Edit channel"
						size="sm"
						variant="ghost"
						onClick={() => setEditChannel(channel)}
					/>
				</Flex>
			))}

			{createGroupModal.isOpen && <CreateGroupModal isOpen onClose={createGroupModal.onClose} />}

			{editChannel && <EditChannelModal isOpen onClose={() => setEditChannel(undefined)} channel={editChannel} />}
		</Flex>
	);
}
