import { useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import dayjs from 'dayjs';
import { EventTemplate, kinds } from 'nostr-tools';

import { Button, Flex, FlexProps, Heading, Textarea } from '@chakra-ui/react';
import { useSigningContext } from '../../../providers/global/signing-provider';
import { usePublishEvent } from '../../../providers/global/publish-provider';
import personalNode, { controlApi } from '../../../services/personal-node';
import useCacheForm from '../../../hooks/use-cache-form';
import decryptionCacheService from '../../../services/decryption-cache';

export default function SendMessageForm({
	pubkey,
	rootId,
	...props
}: { pubkey: string; rootId?: string } & Omit<FlexProps, 'children'>) {
	const publish = usePublishEvent();
	const { requestEncrypt, requestSignature } = useSigningContext();

	const [loadingMessage, setLoadingMessage] = useState('');
	const { getValues, setValue, watch, handleSubmit, formState, reset } = useForm({
		defaultValues: {
			content: '',
		},
		mode: 'all',
	});
	watch('content');

	const clearCache = useCacheForm<{ content: string }>(pubkey, getValues, reset, formState, {
		clearOnKeyChange: true,
		isEmpty: (v) => !v.content,
	});

	const textAreaRef = useRef<HTMLTextAreaElement | null>(null);

	const sendMessage = handleSubmit(async (values) => {
		if (!values.content) return;
		setLoadingMessage('Encrypting...');
		const encrypted = await requestEncrypt(values.content, pubkey);

		const draft: EventTemplate = {
			kind: kinds.EncryptedDirectMessage,
			content: encrypted,
			tags: [['p', pubkey]],
			created_at: dayjs().unix(),
		};

		if (rootId) {
			draft.tags.push(['e', rootId, '', 'root']);
		}

		setLoadingMessage('Signing...');
		const signed = await requestSignature(draft);

		setLoadingMessage('Publishing...');
		const pub = await publish(signed, personalNode!);

		if (pub.event) {
			clearCache();
			reset();

			// add plaintext to decryption context
			decryptionCacheService
				.getOrCreateContainer(pub.event.id, 'nip04', pubkey, encrypted)
				.plaintext.next(values.content);

			// send content to control api
			controlApi?.send(['CONTROL', 'DECRYPTION-CACHE', 'ADD-CONTENT', pub.event.id, values.content]);

			// refocus input
			setTimeout(() => textAreaRef.current?.focus(), 50);
		}
		setLoadingMessage('');
	});

	const formRef = useRef<HTMLFormElement | null>(null);

	return (
		<Flex as="form" gap="2" onSubmit={sendMessage} ref={formRef} {...props}>
			{loadingMessage ? (
				<Heading size="md" mx="auto" my="4">
					{loadingMessage}
				</Heading>
			) : (
				<>
					<Textarea
						mb="2"
						value={getValues().content}
						onChange={(e) => setValue('content', e.target.value, { shouldDirty: true, shouldTouch: true })}
						rows={2}
						isRequired
						ref={textAreaRef}
						onKeyDown={(e) => {
							if (e.ctrlKey && e.key === 'Enter' && formRef.current) formRef.current.requestSubmit();
						}}
					/>
					<Button type="submit">Send</Button>
				</>
			)}
		</Flex>
	);
}
