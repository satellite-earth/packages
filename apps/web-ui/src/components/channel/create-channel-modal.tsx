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
	useToast,
} from '@chakra-ui/react';
import dayjs from 'dayjs';
import { EventTemplate } from 'nostr-tools';
import { useForm } from 'react-hook-form';

import { usePublishEvent } from '../../providers/global/publish-provider';
import { useCurrentCommunity } from '../../providers/local/community-provider';

export default function CreateGroupModal({ isOpen, onClose, ...props }: Omit<ModalProps, 'children'>) {
	const toast = useToast();
	const { relay, community } = useCurrentCommunity();
	const publish = usePublishEvent();
	const { handleSubmit, register, formState } = useForm({
		defaultValues: {
			name: '',
			about: '',
			picture: '',
		},
	});

	const submit = handleSubmit(async (values) => {
		try {
			const tags: string[][] = [];

			const prefix = community.pubkey.slice(0, 8) + '-';
			tags.push(['h', prefix + values.name.toLocaleLowerCase().replaceAll(/\s/g, '-')]);
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
		} catch (err) {
			if (err instanceof Error) toast({ status: 'error', description: err.message });
		}
	});

	return (
		<Modal isOpen={isOpen} onClose={onClose} size="lg" {...props}>
			<ModalOverlay />
			<ModalContent as="form" onSubmit={submit}>
				<ModalHeader>Create New Channel</ModalHeader>
				<ModalCloseButton />
				<ModalBody display="flex" flexDirection="column" gap="2">
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
					<Button onClick={onClose}>Cancel</Button>
					<Button type="submit" colorScheme="brand" isLoading={formState.isLoading} isDisabled={!formState.isValid}>
						Create Channel
					</Button>
				</ModalFooter>
			</ModalContent>
		</Modal>
	);
}
