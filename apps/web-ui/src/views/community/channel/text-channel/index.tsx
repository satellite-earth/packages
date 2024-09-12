import { Flex, IconButton, useDisclosure } from '@chakra-ui/react';
import { COMMUNITY_CHAT_MESSAGE, getChannelName } from '@satellite-earth/core/helpers/nostr';
import { NostrEvent } from 'nostr-tools';

import useTimelineLoader from '../../../../hooks/use-timeline-loader';
import useSubject from '../../../../hooks/use-subject';
import SendMessageForm from './send-message-form';
import TextMessage from './text-message';
import { useCurrentCommunity } from '../../../../providers/local/community-provider';
import Settings01 from '../../../../components/icons/components/settings-01';
import EditChannelModal from '../../../../components/channel/edit-channel-modal';
import SimpleHeader from '../../../../components/layout/presets/simple-header';

export default function TextChannelView({ channelId, channel }: { channelId: string; channel?: NostrEvent }) {
	const edit = useDisclosure();
	const { relay, community } = useCurrentCommunity();

	const timeline = useTimelineLoader(
		`${community.pubkey}-${channelId}-messages`,
		[
			{
				kinds: [COMMUNITY_CHAT_MESSAGE],
				'#h': [channelId],
			},
		],
		relay,
	);

	const messages = useSubject(timeline.timeline);

	return (
		<Flex direction="column" overflow="hidden" h="full">
			<SimpleHeader title={channel && getChannelName(channel)}>
				<IconButton
					icon={<Settings01 boxSize={5} />}
					aria-label="Channel Settings"
					ml="auto"
					variant="ghost"
					onClick={edit.onOpen}
				/>
			</SimpleHeader>
			<Flex overflowX="hidden" overflowY="auto" flex={1} direction="column-reverse" p="2" gap="2">
				{messages.map((message) => (
					<TextMessage key={message.id} message={message} />
				))}
			</Flex>
			<SendMessageForm groupId={channelId} />

			{edit.isOpen && channel && <EditChannelModal channel={channel} isOpen onClose={edit.onClose} />}
		</Flex>
	);
}
