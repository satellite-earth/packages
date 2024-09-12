import { useForm } from 'react-hook-form';
import { EventTemplate } from 'nostr-tools';
import { Button, Flex, Input } from '@chakra-ui/react';
import dayjs from 'dayjs';
import { COMMUNITY_CHAT_MESSAGE } from '@satellite-earth/core/helpers/nostr';

import { usePublishEvent } from '../../../../providers/global/publish-provider';
import { useCurrentCommunity } from '../../../../providers/local/community-provider';

export default function SendMessageForm({ groupId }: { groupId: string }) {
	const { relay } = useCurrentCommunity();
	const publish = usePublishEvent();
	const { register, handleSubmit, formState, reset } = useForm({
		defaultValues: {
			message: '',
		},
	});

	const submit = handleSubmit(async (values) => {
		const draft: EventTemplate = {
			kind: COMMUNITY_CHAT_MESSAGE,
			content: values.message,
			created_at: dayjs().unix(),
			tags: [['h', groupId]],
		};

		await publish(draft, relay);
		reset();
	});

	return (
		<Flex as="form" gap="2" px="2" pb="2" onSubmit={submit}>
			<Input
				type="text"
				placeholder="Send a message"
				{...register('message', {
					required: true,
				})}
				autoComplete="off"
			/>
			<Button type="submit" colorScheme="brand" isLoading={formState.isSubmitting}>
				Send
			</Button>
		</Flex>
	);
}
