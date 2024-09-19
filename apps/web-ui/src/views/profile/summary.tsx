import { Flex, Heading, SimpleGrid } from '@chakra-ui/react';

import useParamsProfilePointer from '../../hooks/use-params-pubkey-pointer';
import useUserMetadata from '../../hooks/use-user-metadata';
import useNostrRequest from '../../hooks/use-nostr-request';
import { kinds, nip10 } from 'nostr-tools';
import NoteCard from '../search/components/note-card';
import SimpleView from '../../components/layout/presets/simple-view';
import useEventsSummaryReport from '../../hooks/reports/use-events-summary-report';

export default function UserSummaryView() {
	const pointer = useParamsProfilePointer();

	const notes = useEventsSummaryReport(`${pointer.pubkey}-notes`, {
		pubkey: pointer.pubkey,
		order: 'created_at',
		kind: kinds.ShortTextNote,
		limit: 20,
	});
	const roots = notes?.filter(({ event }) => !nip10.parse(event).reply);

	return (
		<SimpleView title="Summary">
			<SimpleGrid columns={{ base: 1, lg: 2, xl: 3 }} spacing="4">
				{roots?.slice(0, 6).map(({ event }) => <NoteCard key={event.id} event={event} />)}
			</SimpleGrid>
		</SimpleView>
	);
}
