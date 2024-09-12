import { useMemo } from 'react';
import { nip19 } from 'nostr-tools';
import { Box, Button, ButtonProps, Code, Flex, Heading, IconButton, Link, Text } from '@chakra-ui/react';
import { Outlet, Link as RouterLink, useMatch } from 'react-router-dom';

import useParamsProfilePointer from '../../hooks/use-params-pubkey-pointer';
import useUserMetadata from '../../hooks/use-user-metadata';
import UserAvatar from '../../components/user/user-avatar';
import UserName from '../../components/user/user-name';
import UserDnsIdentity from '../../components/user/user-dns-identity';
import UserAbout from '../../components/user/user-about';
import { DirectMessagesIcon } from '../../components/icons';
import { useBreakpointValue } from '../../providers/global/breakpoint-provider';
import { ExternalLinkIcon } from '@chakra-ui/icons';
import ErrorBoundary from '../../components/error-boundary';
import SimpleNavItem from '../../components/layout/presets/simple-nav-item';
import MobileBottomNav from '../../components/layout/mobile/bottom-nav';

function UserProfilePage({ pubkey }: { pubkey: string }) {
	const match = useMatch('/profile/:address');
	const isMobile = useBreakpointValue({ base: true, lg: false });
	const npub = useMemo(() => nip19.npubEncode(pubkey), [pubkey]);
	const showMenu = !isMobile || !!match;

	const metadata = useUserMetadata(pubkey);
	const pubkeyColor = '#' + pubkey.slice(0, 6);

	if (showMenu) {
		return (
			<Flex overflow="hidden" flex={1} direction={{ base: 'column', lg: 'row' }}>
				<Flex
					overflowY="auto"
					overflowX="hidden"
					h="full"
					maxW={{ base: 'none', lg: 'md' }}
					minW={{ base: 'none', lg: 'md' }}
					direction="column"
					borderRightWidth={1}
				>
					<Flex
						direction="column"
						gap="2"
						p="4"
						pt="max(1rem, var(--safe-top))"
						backgroundImage={metadata?.banner && `url(${metadata?.banner})`}
						backgroundPosition="center"
						backgroundRepeat="no-repeat"
						backgroundSize="cover"
						borderBottomWidth={metadata?.banner ? undefined : 1}
						position="relative"
					>
						<UserAvatar pubkey={pubkey} size="xl" float="left" boxShadow="lg" />
						<IconButton
							icon={<DirectMessagesIcon boxSize={5} />}
							as={RouterLink}
							to={`/profile/${npub}/messages`}
							aria-label="Direct Message"
							colorScheme="blue"
							rounded="full"
							position="absolute"
							bottom="-6"
							right="4"
							size="lg"
						/>
					</Flex>
					<Box p="4">
						<Heading size="md">
							<UserName pubkey={pubkey} isTruncated />
						</Heading>
						<UserDnsIdentity pubkey={pubkey} />
						<Flex gap="2" mt="2">
							<Box w="5" h="5" backgroundColor={pubkeyColor} rounded="full" />
							<Text>Public key color</Text>
							<Code>{pubkeyColor}</Code>
						</Flex>
						{metadata?.website && (
							<Flex gap="2">
								<ExternalLinkIcon boxSize="1.2em" />
								<Link href={metadata.website} target="_blank" color="blue.500" isExternal>
									{metadata.website}
								</Link>
							</Flex>
						)}
						<UserAbout pubkey={pubkey} mt="2" noOfLines={3} />
					</Box>
					<Flex direction="column" p="2" gap="2">
						<SimpleNavItem to={`/profile/${npub}/summary`}>Summary</SimpleNavItem>
						<SimpleNavItem to={`/profile/${npub}/notes`}>Notes</SimpleNavItem>
						<SimpleNavItem to={`/profile/${npub}/articles`}>Articles</SimpleNavItem>
					</Flex>
				</Flex>
				{!isMobile && (
					<ErrorBoundary>
						<Outlet />
					</ErrorBoundary>
				)}
			</Flex>
		);
	}

	return (
		<ErrorBoundary>
			<Outlet />
		</ErrorBoundary>
	);
}

export default function UserProfileView() {
	const pointer = useParamsProfilePointer();

	return <UserProfilePage pubkey={pointer.pubkey} />;
}
