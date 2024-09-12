import { Box, Flex } from '@chakra-ui/react';
import { NostrEvent } from 'nostr-tools';

import UserAvatar from '../../../../components/user/user-avatar';
import UserName from '../../../../components/user/user-name';
import useEventZaps from '../../../../hooks/use-event-zaps';
import InlineZaps, { InlineZapButton } from './inline-zaps';
import { useCurrentCommunity } from '../../../../providers/local/community-provider';

export default function TextMessage({ message }: { message: NostrEvent }) {
	const { relay } = useCurrentCommunity();
	const zaps = useEventZaps(message.id, relay);

	return (
		<Flex direction="column" gap="2">
			<Box>
				{zaps.length === 0 && <InlineZapButton event={message} float="right" ml="2" />}
				<UserAvatar pubkey={message.pubkey} size="sm" verticalAlign="middle" mr="2" />
				<UserName pubkey={message.pubkey} />: {message.content}
			</Box>
			{zaps.length > 0 && <InlineZaps event={message} />}
		</Flex>
	);
}
