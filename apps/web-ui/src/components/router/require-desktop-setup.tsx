import { PropsWithChildren, useState } from 'react';
import { Flex, Box, VStack, Text, FormControl, FormLabel, Input, FormErrorMessage, Button } from '@chakra-ui/react';
import useSubject from '../../hooks/use-subject';
import { controlApi } from '../../services/personal-node';

// TODO call the function window.satellite.setOwner(seckey) to set the owner
// this function should update the owner's pubkey in the config file and the
// owner's seckey in the keychain

// This view is the place for intro/onboarding information

function DesktopSetup() {
	const [secretKey, setSecretKey] = useState('');
	const [error, setError] = useState('');

	const handleAddIdentity = async (e: React.FormEvent) => {
		e.preventDefault();
		try {
			await window.satellite?.addIdentity(secretKey);
			setError('');
		} catch (err) {
			console.error(err);
			setError('Invalid secret key');
		}
	};

	const handleCreateNewIdentity = async () => {
		try {
			await window.satellite?.newIdentity();
			setError('');
		} catch (err) {
			console.error(err);
			setError('Failed to create new identity');
		}
	};

	return (
		<Flex w="full" h="full" alignItems="center" justifyContent="center" direction="column">
			<Box maxWidth="400px" width="100%">
				<VStack spacing={4}>
					<FormControl isInvalid={!!error}>
						<Input
							id="secretKey"
							type="password"
							value={secretKey}
							onChange={(e) => setSecretKey(e.target.value)}
							onFocus={() => setError('')}
							placeholder="nsec1..."
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
				</VStack>
			</Box>
		</Flex>
	);
}

export default function RequireDesktopSetup({ children }: PropsWithChildren) {
	const isDesktop = window.satellite != null;
	const config = useSubject(controlApi?.config);

	if (isDesktop && !config?.owner) {
		return <DesktopSetup />;
	}

	return <>{children}</>;
}
