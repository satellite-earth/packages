import { PropsWithChildren, useState } from 'react';
import { Flex, Box, VStack, Text, FormControl, FormLabel, Input, FormErrorMessage, Button } from '@chakra-ui/react';
import { generateSeedWords, privateKeyFromSeedWords } from 'nostr-tools/nip06';
import { npubEncode } from 'nostr-tools/nip19';
import { getPublicKey } from 'nostr-tools/pure';
import { hexToBytes } from '@noble/hashes/utils';
import useSubject from '../../hooks/use-subject';
import { controlApi } from '../../services/personal-node';

// TODO add intro/onboarding information

function DesktopSetup({ onComplete }: { onComplete: () => void }) {
	const [seedWords, setSeedWords] = useState<string[]>([]);
	const [generatedNpub, setGeneratedNpub] = useState('');
	const [secretKey, setSecretKey] = useState('');
	const [error, setError] = useState('');

	const handleAddIdentity = async (e: React.FormEvent) => {
		e.preventDefault();
		try {
			let input = secretKey.trim();
			let sk = input;

			// If the input contains spaces, treat it as seed words
			// and try to convert it to a hex secret key
			if (input.includes(' ')) {
				sk = privateKeyFromSeedWords(input);
			}

			await window.satellite?.addIdentity(sk);
			onComplete();
			setError('');
		} catch (err) {
			console.error(err);
			setError('Invalid secret key or seed words');
		}
	};

	const handleCreateNewIdentity = () => {
		try {
			const words = generateSeedWords();
			setSeedWords(words.split(' '));
			const seckey = privateKeyFromSeedWords(words);
			const pubkey = getPublicKey(hexToBytes(seckey));
			const npub = npubEncode(pubkey);
			setGeneratedNpub(npub);
			setError('');
		} catch (err) {
			console.error(err);
			setError('Failed to create new identity');
		}
	};

	const handleAcceptSeedWords = async () => {
		try {
			const sk = privateKeyFromSeedWords(seedWords.join(' '));
			await window.satellite?.addIdentity(sk);
			onComplete();
		} catch (err) {
			console.error(err);
			setError('Failed to create new identity');
		}
	};

	return (
		<Flex w="full" h="full" alignItems="center" justifyContent="center" direction="column">
			<Box maxWidth="400px" width="100%">
				<VStack spacing={4}>
					{seedWords.length === 0 ? (
						<>
							<FormControl isInvalid={!!error}>
								<Input
									id="secretKey"
									type="password"
									value={secretKey}
									onChange={(e) => setSecretKey(e.target.value)}
									onFocus={() => setError('')}
									placeholder="nsec or seed words..."
								/>
								<FormErrorMessage>{error}</FormErrorMessage>
							</FormControl>
							<Button onClick={handleAddIdentity} type="submit" colorScheme="blue" width="100%">
								Add Identity
							</Button>
							<Text>or</Text>
							<Button onClick={handleCreateNewIdentity} colorScheme="green" width="100%">
								Create New Identity
							</Button>
						</>
					) : (
						<>
							<Text>Your generated seed words:</Text>
							<Box p={4} borderWidth={1} borderRadius="md" position="relative">
								<Text as="pre" userSelect="all" fontFamily="monospace" whiteSpace="pre-wrap" wordBreak="break-word">
									{seedWords.join(' ')}
								</Text>
							</Box>
							<Text>Your generated npub:</Text>
							<Box p={4} borderWidth={1} borderRadius="md" position="relative">
								<Text as="pre" userSelect="all" fontFamily="monospace" whiteSpace="pre-wrap" wordBreak="break-word">
									{generatedNpub}
								</Text>
							</Box>
							<Button onClick={handleAcceptSeedWords} colorScheme="green" width="100%">
								Accept
							</Button>
							<Button onClick={handleCreateNewIdentity} colorScheme="blue" width="100%">
								Regenerate
							</Button>
						</>
					)}
				</VStack>
			</Box>
		</Flex>
	);
}

export default function RequireDesktopSetup({ children }: PropsWithChildren) {
	const [completedSetup, setCompletedSetup] = useState(false);
	const isDesktop = window.satellite != null;
	const config = useSubject(controlApi?.config);

	if (!completedSetup && isDesktop && !config?.owner) {
		return <DesktopSetup onComplete={() => setCompletedSetup(true)} />;
	}

	return <>{children}</>;
}
