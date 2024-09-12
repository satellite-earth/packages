import { useMemo, useState } from 'react';
import { Outlet, useMatch } from 'react-router-dom';
import { Button, ButtonGroup, Flex } from '@chakra-ui/react';
import { FixedSizeList, ListChildComponentProps } from 'react-window';
import AutoSizer from 'react-virtualized-auto-sizer';
import { ReportResults } from '@satellite-earth/core/types/control-api/reports.js';
import { getPubkeysFromList } from '@satellite-earth/core/helpers/nostr/lists.js';

import useSubject from '../../hooks/use-subject';
import ConversationButton from './components/conversation-button';
import SimpleHeader from '../../components/layout/presets/simple-header';
import draftService from '../../services/drafts';
import useConversationsReport from '../../hooks/reports/use-conversations-report';
import useUserContactList from '../../hooks/use-user-contact-list';
import useCurrentAccount from '../../hooks/use-current-account';
import { useBreakpointValue } from '../../providers/global/breakpoint-provider';
import ErrorBoundary from '../../components/error-boundary';

function Conversation({ index, style, data }: ListChildComponentProps<ReportResults['CONVERSATIONS'][]>) {
	const conversation = data[index];

	return (
		<ConversationButton
			pubkey={conversation.pubkey}
			lastReceived={conversation.lastReceived}
			lastSent={conversation.lastSent}
			style={style}
		/>
	);
}

export default function MessagesView() {
	const match = useMatch('/messages');
	const conversations = useConversationsReport();
	const account = useCurrentAccount();
	const contacts = useUserContactList(account?.pubkey);
	const contactPubkeys = useMemo(
		() => new Set(contacts && getPubkeysFromList(contacts).map((p) => p.pubkey)),
		[contacts],
	);

	const [filter, setFilter] = useState('contacts');

	const contactsConversations = useMemo(
		() => conversations?.filter((c) => contactPubkeys.has(c.pubkey)),
		[contactPubkeys, conversations],
	);
	const otherConversations = useMemo(
		() => conversations?.filter((c) => !contactPubkeys.has(c.pubkey)),
		[contactPubkeys, conversations],
	);

	useSubject(draftService.onDraftsChange);

	const filtered =
		filter === 'contacts' && contactsConversations && contactsConversations.length > 0
			? contactsConversations
			: otherConversations;

	const isMobile = useBreakpointValue({ base: true, lg: false });
	const showMenu = !isMobile || !!match;

	if (showMenu) {
		return (
			<Flex w="full" overflow="hidden" h="full">
				<Flex
					direction="column"
					w={{ base: 'full', lg: 'md' }}
					overflow={{ base: 'hidden', sm: 'auto' }}
					flexShrink={0}
					pb={{ base: 0, md: 'var(--safe-bottom)' }}
				>
					<SimpleHeader title="Messages" />
					<ButtonGroup m="2" size="sm" variant="outline">
						<Button onClick={() => setFilter('contacts')} variant={filter === 'contacts' ? 'solid' : 'outline'}>
							Contacts
						</Button>
						<Button onClick={() => setFilter('other')} variant={filter === 'other' ? 'solid' : 'outline'}>
							Other
						</Button>
					</ButtonGroup>
					<Flex h="full" flex={1} overflow="hidden">
						<AutoSizer>
							{({ width, height }) => (
								<FixedSizeList
									height={height}
									width={width}
									itemData={filtered ?? []}
									itemCount={filtered?.length ?? 0}
									itemKey={(i, data) => data[i].pubkey}
									itemSize={64}
								>
									{Conversation}
								</FixedSizeList>
							)}
						</AutoSizer>
					</Flex>
				</Flex>
				<Flex direction="column" flex={1}>
					<ErrorBoundary>
						<Outlet />
					</ErrorBoundary>
				</Flex>
			</Flex>
		);
	}

	return (
		<ErrorBoundary>
			<Outlet />
		</ErrorBoundary>
	);
}
