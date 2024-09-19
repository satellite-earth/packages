import { useState } from 'react';
import { Button, ButtonGroup } from '@chakra-ui/react';

import useParamsProfilePointer from '../../hooks/use-params-pubkey-pointer';
import SimpleView from '../../components/layout/presets/simple-view';
import useEventsSummaryReport from '../../hooks/reports/use-events-summary-report';
import NoteCard from '../search/components/note-card';
import { kinds } from 'nostr-tools';

export default function UserNotesView() {
	const pointer = useParamsProfilePointer();
	const [order, setOrder] = useState<'interactions' | 'created_at'>('interactions');

	const notes = useEventsSummaryReport(`${pointer.pubkey}-notes`, {
		pubkey: pointer.pubkey,
		order,
		kind: kinds.ShortTextNote,
		limit: 20,
	});

	return (
		<SimpleView title="Notes">
			<ButtonGroup size="sm">
				<Button onClick={() => setOrder('interactions')} colorScheme={order === 'interactions' ? 'brand' : undefined}>
					Popular
				</Button>
				<Button onClick={() => setOrder('created_at')} colorScheme={order === 'created_at' ? 'brand' : undefined}>
					Latest
				</Button>
			</ButtonGroup>
			{notes?.map((result) => (
				<NoteCard
					key={result.event.id}
					event={result.event}
					reactions={result.reactions}
					shares={result.shares}
					replies={result.replies}
				/>
			))}
		</SimpleView>
	);
}
