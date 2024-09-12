import { useEffect, useState } from 'react';
import { Alert, AlertDescription, AlertIcon, Button, ButtonProps } from '@chakra-ui/react';
import { NostrEvent } from 'nostr-tools';

import LockUnlocked01 from '../../../components/icons/components/lock-unlocked-01';
import { useKind4Decrypt } from '../../../hooks/use-kind4-decryption';

export default function DecryptPlaceholder({
	children,
	message,
	...props
}: {
	children: (decrypted: string) => JSX.Element;
	message: NostrEvent;
} & Omit<ButtonProps, 'children'>): JSX.Element {
	const [loading, setLoading] = useState(false);
	const { requestDecrypt, plaintext, error } = useKind4Decrypt(message);

	const decrypt = async () => {
		setLoading(true);
		try {
			await requestDecrypt();
		} catch (e) {}
		setLoading(false);
	};

	// auto decrypt
	useEffect(() => {
		if (!plaintext && !error) {
			setLoading(true);
			requestDecrypt()
				.catch(() => {})
				.finally(() => {
					setLoading(false);
				});
		}
	}, [error, plaintext]);

	if (plaintext) {
		return children(plaintext);
	}
	if (error) {
		return (
			<Alert status="error">
				<AlertIcon />
				<AlertDescription>{error.message}</AlertDescription>
				{/* <DebugEventButton event={message} size="sm" ml="auto" mr="2" /> */}
				<Button isLoading={loading} leftIcon={<LockUnlocked01 />} onClick={decrypt} size="sm">
					Try again
				</Button>
			</Alert>
		);
	}
	return (
		<Button onClick={decrypt} isLoading={loading} leftIcon={<LockUnlocked01 />} width="full" {...props}>
			Decrypt
		</Button>
	);
}
