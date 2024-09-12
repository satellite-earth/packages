import {
	Button,
	FormControl,
	FormHelperText,
	FormLabel,
	Input,
	Modal,
	ModalBody,
	ModalCloseButton,
	ModalContent,
	ModalFooter,
	ModalHeader,
	ModalOverlay,
	ModalProps,
	Textarea,
} from '@chakra-ui/react';
import { EventTemplate, NostrEvent } from 'nostr-tools';
import { useForm } from 'react-hook-form';
import { getTagValue } from '@satellite-earth/core/helpers/nostr';
import dayjs from 'dayjs';

import { usePublishEvent } from '../../providers/global/publish-provider';
import { useState } from 'react';
import { useCurrentCommunity } from '../../providers/local/community-provider';

export default function EditChannelModal({
	isOpen,
	onClose,
	channel,
	...props
}: Omit<ModalProps, 'children'> & { channel: NostrEvent }) {
	const { relay } = useCurrentCommunity();
	const publish = usePublishEvent();

	const channelId = getTagValue(channel, 'd');
	const { handleSubmit, register, formState } = useForm({
		defaultValues: {
			name: getTagValue(channel, 'name'),
			about: getTagValue(channel, 'about'),
			picture: getTagValue(channel, 'picture'),
		},
	});

	const submit = handleSubmit(async (values) => {
		if (!channelId) return;
		const tags: string[][] = [];

		tags.push(['h', channelId]);
		if (values.name) tags.push(['name', values.name]);
		if (values.about) tags.push(['about', values.about]);
		if (values.picture) tags.push(['picture', values.picture]);

		const draft: EventTemplate = {
			kind: 9002,
			content: '',
			tags,
			created_at: dayjs().unix(),
		};

		await publish(draft, relay);
		onClose();
	});

	const [loading, setLoading] = useState(false);
	const deleteChannel = async () => {
		if (!channelId) return;
		setLoading(true);

		const draft: EventTemplate = {
			kind: 9006,
			content: '',
			tags: [['h', channelId], ['purge']],
			created_at: dayjs().unix(),
		};

		await publish(draft, relay);
		onClose();

		setLoading(false);
	};

	return (
		<Modal isOpen={isOpen} onClose={onClose} size="lg" {...props}>
			<ModalOverlay />
			<ModalContent as="form" onSubmit={submit}>
				<ModalHeader>Update Channel</ModalHeader>
				<ModalCloseButton />
				<ModalBody>
					<FormControl isRequired>
						<FormLabel>Channel Name</FormLabel>
						<Input
							{...register('name', {
								required: true,
							})}
							isRequired
							placeholder="New Group"
							autoComplete="off"
						/>
						<FormHelperText>The name of the group that your about to create</FormHelperText>
					</FormControl>

					<FormControl>
						<FormLabel>Picture</FormLabel>
						<Input type="url" {...register('picture')} autoComplete="off" />
					</FormControl>

					<FormControl>
						<FormLabel>About</FormLabel>
						<Textarea {...register('about')} autoComplete="off" />
					</FormControl>
				</ModalBody>
				<ModalFooter gap="2" display="flex">
					<Button onClick={deleteChannel} colorScheme="red" mr="auto" isLoading={loading}>
						Delete Channel
					</Button>
					<Button onClick={onClose}>Cancel</Button>
					<Button type="submit" colorScheme="brand" isLoading={formState.isLoading}>
						Update Channel
					</Button>
				</ModalFooter>
			</ModalContent>
		</Modal>
	);
}
