import { PropsWithChildren, useEffect, useRef, useState } from 'react';
import { Button, Flex, Heading, Spinner } from '@chakra-ui/react';
import { To, useLocation, Link as RouterLink, useNavigate } from 'react-router-dom';

import personalNode from '../../services/personal-node';
import useSubject from '../../hooks/use-subject';
import { useSigningContext } from '../../providers/global/signing-provider';

export default function RequirePersonalNodeAuth({ children }: PropsWithChildren) {
	const location = useLocation();
	const isFirstAuthentication = useSubject(personalNode?.isFirstAuthentication);
	const connected = useSubject(personalNode?.connectedSub);
	const authenticated = useSubject(personalNode?.authenticated);
	const challenge = useSubject(personalNode?.onChallenge);
	const { requestSignature } = useSigningContext();
	const navigate = useNavigate();

	const loading = useRef(false);
	useEffect(() => {
		// wait for the personalNode to be connected and a challenge
		if (!personalNode || !connected || authenticated || !challenge) return;

		if (loading.current) return;
		loading.current = true;

		personalNode
			.authenticate((draft) => requestSignature(draft))
			?.catch(() => {
				navigate('/connect/auth', { state: { back: (location.state?.back ?? location) satisfies To } });
			})
			.finally(() => (loading.current = false));
	}, [connected, authenticated, challenge]);

	// initial auth UI
	if (!authenticated && isFirstAuthentication && connected)
		return (
			<Flex direction="column" gap="2" alignItems="center" justifyContent="center" h="full">
				<Flex gap="2" alignItems="center">
					<Spinner />
					<Heading size="md">Authenticating...</Heading>
				</Flex>
				<Button
					mt="2"
					variant="link"
					as={RouterLink}
					to="/connect/auth"
					state={{ back: (location.state?.back ?? location) satisfies To }}
				>
					Cancel
				</Button>
			</Flex>
		);

	return <>{children}</>;
}
