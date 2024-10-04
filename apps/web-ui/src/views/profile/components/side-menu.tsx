import { useMemo } from 'react';
import { Box, Code, Flex, Heading, IconButton, Link, Text } from '@chakra-ui/react';
import { kinds, nip19 } from 'nostr-tools';
import { Link as RouterLink } from 'react-router-dom';
import { ExternalLinkIcon } from '@chakra-ui/icons';

import useUserMetadata from '../../../hooks/use-user-profile';
import UserAvatar from '../../../components/user/user-avatar';
import { DirectMessagesIcon } from '../../../components/icons';
import UserName from '../../../components/user/user-name';
import UserDnsIdentity from '../../../components/user/user-dns-identity';
import UserAbout from '../../../components/user/user-about';
import SimpleNavItem from '../../../components/layout/presets/simple-nav-item';
import useEventCount from '../../../hooks/use-event-count';

export default function SideMenu({ pubkey }: { pubkey: string }) {
	const npub = useMemo(() => nip19.npubEncode(pubkey), [pubkey]);

	const metadata = useUserMetadata(pubkey);
	const pubkeyColor = '#' + pubkey.slice(0, 6);

	const articles = useEventCount([{ kinds: [kinds.LongFormArticle], authors: [pubkey] }]) ?? 0;

	return (
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
				{articles > 0 && <SimpleNavItem to={`/profile/${npub}/articles`}>Articles ({articles})</SimpleNavItem>}
			</Flex>
		</Flex>
	);
}
