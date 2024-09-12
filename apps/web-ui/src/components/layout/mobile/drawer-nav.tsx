import {
	Box,
	Button,
	Center,
	Divider,
	Drawer,
	DrawerBody,
	DrawerContent,
	DrawerHeader,
	DrawerOverlay,
	Flex,
	ModalProps,
	Spacer,
	Text,
} from '@chakra-ui/react';
import { Link as RouterLink } from 'react-router-dom';
import { IconButton } from '@chakra-ui/react';

import useSubject from '../../../hooks/use-subject';
import communitiesService from '../../../services/communities';
import { UserAvatar } from '../../user/user-avatar';
import useCurrentAccount from '../../../hooks/use-current-account';
import UserName from '../../user/user-name';
import UserDnsIdentity from '../../user/user-dns-identity';
// import ColorModeButton from '../../color-mode-button';
import personalNode from '../../../services/personal-node';
import { DirectMessagesIcon, SatelliteDishIcon, SearchIcon, SettingsIcon } from '../../icons';

export default function DrawerNav({ isOpen, onClose, ...props }: Omit<ModalProps, 'children'>) {
	const account = useCurrentAccount();

	const community = useSubject(communitiesService.community);
	const communities = useSubject(communitiesService.communities);

	return (
		<Drawer placement="left" onClose={onClose} isOpen={isOpen} {...props}>
			<DrawerOverlay />
			<DrawerContent>
				<DrawerHeader borderBottomWidth="1px" display="flex" gap="2" p="4">
					{account ? (
						<>
							<UserAvatar pubkey={account.pubkey} />
							<Box flex={1}>
								<UserName pubkey={account.pubkey} isTruncated />
								<Text fontSize="sm" fontWeight="normal" isTruncated>
									<UserDnsIdentity pubkey={account.pubkey} />
								</Text>
							</Box>
							<IconButton
								as={RouterLink}
								w="10"
								h="10"
								aria-label="Settings"
								title="Settings"
								variant="outline"
								icon={<SettingsIcon boxSize={5} />}
								to="/settings"
							/>
							{/* <ColorModeButton variant="ghost" /> */}
						</>
					) : (
						<Button as={RouterLink} to="/login">
							Login
						</Button>
					)}
				</DrawerHeader>
				<DrawerBody p="0" display="flex" flexDirection="column">
					<Flex as={RouterLink} to="/search" alignItems="center" p="2" gap="2" tabIndex={0} cursor="pointer">
						<Center w="10" h="10">
							<SearchIcon boxSize={5} />
						</Center>
						<Text fontWeight="bold">Search</Text>
					</Flex>
					<Flex as={RouterLink} to="/messages" alignItems="center" p="2" gap="2" tabIndex={0} cursor="pointer">
						<Center w="10" h="10">
							<DirectMessagesIcon boxSize={5} />
						</Center>
						<Text fontWeight="bold">Messages</Text>
					</Flex>
					<Flex as={RouterLink} to="/network" alignItems="center" p="2" gap="2" tabIndex={0} cursor="pointer">
						<Center w="10" h="10">
							<SatelliteDishIcon boxSize={6} />
						</Center>
						<Text fontWeight="bold">My Network</Text>
					</Flex>
					{communities.length > 0 ? <Divider /> : null}
					<Spacer />
					{/* {communities.map((community) => (
						<MobileCommunityButton community={community} key={community.id} />
					))} */}
					<Spacer />
					{personalNode && (
						<Button variant="link" p="4" w="full" as={RouterLink} to="/dashboard">
							Satellite
						</Button>
					)}
				</DrawerBody>
			</DrawerContent>
		</Drawer>
	);
}
