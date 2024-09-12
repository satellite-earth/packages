import { forwardRef } from 'react';
import { Input, InputProps } from '@chakra-ui/react';

import useTimelineLoader from '../hooks/use-timeline-loader';
import personalNode from '../services/personal-node';
import useSubject from '../hooks/use-subject';

export type RelayUrlInputProps = Omit<InputProps, 'type'>;

const NOSTR_WATCH_PUBKEY = '151c17c9d234320cf0f189af7b761f63419fd6c38c6041587a008b7682e4640f';
const NOSTR_WATCH_RELAY = 'wss://history.nostr.watch/';

export const RelayUrlInput = forwardRef(({ ...props }: Omit<InputProps, 'type'>, ref) => {
	const timeline = useTimelineLoader(
		'clearnet-relays',
		[{ kinds: [30166], authors: [NOSTR_WATCH_PUBKEY], since: 1704196800, '#n': ['clearnet'] }],
		personalNode ? [personalNode, NOSTR_WATCH_RELAY] : [NOSTR_WATCH_RELAY],
	);

	const events = useSubject(timeline.timeline);

	return (
		<>
			<Input ref={ref} list="relay-suggestions" type="url" {...props} />
			<datalist id="relay-suggestions">
				{events.map((event) => {
					const url = event.tags.find((t) => t[0] === 'd')?.[1];

					return (
						<option key={event.id} value={url}>
							{url}
						</option>
					);
				})}
			</datalist>
		</>
	);
});
