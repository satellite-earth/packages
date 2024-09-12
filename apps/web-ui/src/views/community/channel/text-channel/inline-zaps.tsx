import { Flex, IconButton, IconButtonProps, Tag, TagLabel, useToast } from '@chakra-ui/react';
import { NostrEvent, nip57 } from 'nostr-tools';

import { ZapIcon } from '../../../../components/icons';
import UserAvatar from '../../../../components/user/user-avatar';
import useEventZaps from '../../../../hooks/use-event-zaps';
import { useSigningContext } from '../../../../providers/global/signing-provider';
import useUserMetadata from '../../../../hooks/use-user-metadata';
import { getZapEndpoint } from '../../../../helpers/nostr/zaps';
import { getInvoiceFromCallbackUrl } from '../../../../helpers/nostr/lnurl';
import eventZapsService from '../../../../services/event-zaps';
import { readablizeSats } from '../../../../helpers/bolt11';
import { useCurrentCommunity } from '../../../../providers/local/community-provider';

export function InlineZapButton({
	event,
	...props
}: { event: NostrEvent } & Omit<IconButtonProps, 'aria-label' | 'icon'>) {
	const toast = useToast();
	const { relay } = useCurrentCommunity();
	const { requestSignature } = useSigningContext();
	const metadata = useUserMetadata(event.pubkey);

	const makeZap = async () => {
		try {
			if (!window.webln) throw new Error('Missing WebLN');
			if (!metadata) throw new Error('No user metadata');

			const amount = parseInt(prompt('Amount') || '0') * 1000;
			if (amount) {
				const request = nip57.makeZapRequest({
					event: event.id,
					amount,
					profile: event.pubkey,
					relays: [relay.url],
					comment: '',
				});

				const signed = await requestSignature(request);
				const endpoint = await getZapEndpoint(metadata);
				if (!endpoint) throw new Error('Missing LNURL endpoint');

				const callback = new URL(endpoint);
				callback.searchParams.append('amount', String(amount));
				callback.searchParams.append('nostr', JSON.stringify(signed));

				const invoice = await getInvoiceFromCallbackUrl(callback);

				if (!window.webln.enabled) await window.webln.enable();
				await window.webln.sendPayment(invoice);

				setTimeout(() => {
					eventZapsService.requestZaps(event.id, relay, true);
				}, 1000);
			}
		} catch (e) {
			if (e instanceof Error)
				toast({
					status: 'error',
					description: e.message,
				});
			console.log(e);
		}
	};

	return (
		<IconButton
			icon={<ZapIcon />}
			aria-label="Zap Message"
			variant="ghost"
			colorScheme="yellow"
			borderRadius="50%"
			size="sm"
			onClick={makeZap}
			{...props}
		/>
	);
}

export default function InlineZaps({ event }: { event: NostrEvent }) {
	const { relay } = useCurrentCommunity();
	const zaps = useEventZaps(event.id, relay);

	return (
		<Flex
			gap="2"
			overflowY="hidden"
			overflowX="auto"
			style={{
				scrollbarWidth: 'none',
			}}
		>
			<InlineZapButton event={event} />
			{zaps.map((zap) => (
				<Tag key={zap.receipt.id} size="lg" variant="outline" colorScheme="yellow" borderRadius="full" flexShrink={0}>
					<ZapIcon ml={-1} mr={2} />
					<TagLabel>{readablizeSats((zap.payment.amount || 0) / 1000)}</TagLabel>
					<UserAvatar pubkey={zap.request.pubkey} size="xs" ml={2} mr={-2} />
				</Tag>
			))}
		</Flex>
	);
}
