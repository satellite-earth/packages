import { useCallback, useMemo } from 'react';
import { getDMRecipient, getDMSender } from '@satellite-earth/core/helpers/nostr/dms.js';
import { NostrEvent } from 'nostr-tools';

import decryptionCacheService from '../services/decryption-cache';
import useCurrentAccount from './use-current-account';
import useSubject from './use-subject';

export function useKind4Decrypt(event: NostrEvent) {
	const account = useCurrentAccount()!;
	const pubkey = event.pubkey === account.pubkey ? getDMRecipient(event) : getDMSender(event);

	const container = useMemo(
		() => decryptionCacheService.getOrCreateContainer(event.id, 'nip04', pubkey, event.content),
		[event, pubkey],
	);

	const plaintext = useSubject(container.plaintext);
	const error = useSubject(container.error);

	const requestDecrypt = useCallback(() => {
		const p = decryptionCacheService.requestDecrypt(container);
		decryptionCacheService.startDecryptionQueue();
		return p;
	}, [container]);

	return { container, error, plaintext, requestDecrypt };
}
