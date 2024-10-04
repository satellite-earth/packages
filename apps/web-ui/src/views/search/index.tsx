import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import {
	Alert,
	AlertIcon,
	Button,
	ButtonGroup,
	Flex,
	Heading,
	IconButton,
	Input,
	LinkBox,
	useDisclosure,
} from '@chakra-ui/react';
import { kinds, NostrEvent } from 'nostr-tools';
import { SearchIcon } from '@chakra-ui/icons';
import { useSearchParams } from 'react-router-dom';

import personalNode from '../../services/personal-node';
import ProfileCard from './components/profile-card';
import NoteCard from './components/note-card';
import { BackButton } from '../../components/back-button';
import useDMSearchReport from '../../hooks/reports/use-dm-search-report';
import ConversationCard from './components/conversation-card';
import { useBreakpointValue } from '../../providers/global/breakpoint-provider';
import { eventStore } from '../../services/query-store';

export default function SearchView() {
	const shouldAutoFocusInput = useBreakpointValue({ base: false, lg: true });
	const [search, setSearch] = useSearchParams();
	const { register, handleSubmit, formState, getValues } = useForm({
		defaultValues: { query: search.get('q') ?? '' },
		mode: 'all',
	});

	const showUsers = useDisclosure({ defaultIsOpen: true });
	const showMessages = useDisclosure({ defaultIsOpen: true });
	const showEvents = useDisclosure({ defaultIsOpen: true });

	const [searchError, setSearchError] = useState<string>();
	const [profiles, setProfiles] = useState<NostrEvent[]>([]);

	const [events, setEvents] = useState<NostrEvent[]>([]);

	const submit = handleSubmit((values) => {
		const newSearch = new URLSearchParams(search);
		newSearch.set('q', values.query);
		setSearch(newSearch);
	});

	const query = search.get('q');
	const { conversations, messages } = useDMSearchReport(query || '', { order: 'created_at' });

	useEffect(() => {
		if (!query || query.length < 3) {
			setProfiles([]);
			setEvents([]);
			return;
		}

		setSearchError('');
		setProfiles([]);
		const profileSearch = personalNode?.subscribe(
			[
				{
					kinds: [kinds.Metadata],
					search: query,
				},
			],
			{
				onevent: (event) => {
					eventStore.add(event);
					setProfiles((arr) => [...arr, event]);
				},
				oneose: () => {
					if (profileSearch) profileSearch.close();
				},
				onclose: (reason) => {
					if (reason !== 'closed by caller') setSearchError(reason);
				},
			},
		);

		setEvents([]);
		const sub = personalNode?.subscribe(
			[
				{
					kinds: [kinds.ShortTextNote],
					search: query,
					// @ts-expect-error
					order: 'created_at',
				},
			],
			{
				onevent: (event) => {
					setEvents((arr) => [...arr, event]);
				},
				oneose: () => {
					if (sub) sub.close();
				},
			},
		);
	}, [query]);

	const hasResults = events.length > 0 || profiles.length > 0 || (messages?.length ?? 0) > 0;

	return (
		<>
			<Flex w="full" flex={1} direction="column" overflowY="hidden">
				<Flex
					as="form"
					onSubmit={submit}
					maxW="4xl"
					w="full"
					mx="auto"
					p="2"
					gap="1"
					direction="column"
					mt="var(--safe-top)"
				>
					<Flex gap="2">
						<BackButton />
						<Input
							type="search"
							{...register('query', { required: true, minLength: 3 })}
							isRequired
							minLength={3}
							placeholder="Search your node"
							autoFocus={shouldAutoFocusInput}
						/>
						<IconButton
							type="submit"
							icon={<SearchIcon boxSize={5} />}
							aria-label="Search"
							colorScheme="brand"
							isLoading={formState.isSubmitting}
						/>
					</Flex>
					{hasResults && (
						<ButtonGroup size="xs">
							<Button onClick={showUsers.onToggle} variant={showUsers.isOpen ? 'solid' : 'outline'}>
								Users ({profiles.length})
							</Button>
							<Button onClick={showMessages.onToggle} variant={showMessages.isOpen ? 'solid' : 'outline'}>
								Messages ({messages?.length ?? 0})
							</Button>
							<Button onClick={showEvents.onToggle} variant={showEvents.isOpen ? 'solid' : 'outline'}>
								Notes ({events.length})
							</Button>
						</ButtonGroup>
					)}
				</Flex>

				<Flex w="full" overflowY="auto" pb="12">
					<Flex maxW="4xl" w="full" mx="auto" direction="column" gap="4" px="2">
						{searchError && (
							<Alert status="warning">
								<AlertIcon />
								{searchError}
							</Alert>
						)}
						{showUsers.isOpen && profiles.length > 0 && (
							<Flex overflowX="auto" overflowY="hidden" gap="2" p="4" as={LinkBox} flexShrink={0}>
								{profiles.map((event) => (
									<ProfileCard key={event.pubkey} profile={event} />
								))}
							</Flex>
						)}

						{showMessages.isOpen && conversations && conversations.length > 0 && (
							<>
								<Heading size="md">Messages ({messages?.length ?? 0})</Heading>
								{conversations?.map((conversation) => (
									<ConversationCard key={conversation.id} conversation={conversation} />
								))}
							</>
						)}

						{showEvents.isOpen && events.length > 0 && (
							<>
								<Heading size="md">Notes ({events.length})</Heading>
								{events.map((event) => (
									<NoteCard key={event.id} event={event} />
								))}
							</>
						)}
					</Flex>
				</Flex>
			</Flex>
		</>
	);
}
