import { PropsWithChildren } from 'react';
import { Button, Code, Flex, Heading, Spinner, Text } from '@chakra-ui/react';
import { Navigate, To, useLocation } from 'react-router-dom';
import { Link as RouterLink } from 'react-router-dom';

import personalNode from '../../services/personal-node';
import useSubject from '../../hooks/use-subject';
import useReconnectAction from '../../hooks/use-reconnect-action';

function InitialConnectionOverlay() {
	const location = useLocation();

	const { error } = useReconnectAction();

	return (
		<Flex w="full" h="full" alignItems="center" justifyContent="center" direction="column">
			<Flex gap="2" alignItems="center">
				<Spinner />
				<Heading size="md">Connecting to...</Heading>
			</Flex>
			<Code>{personalNode?.url}</Code>
			{error && <Text color="red">{error.message}</Text>}
			<Button
				variant="link"
				mt="4"
				as={RouterLink}
				to="/connect"
				replace
				state={{ back: (location.state?.back ?? location) satisfies To }}
			>
				Cancel
			</Button>
		</Flex>
	);
}

export default function RequirePersonalNode({ children }: PropsWithChildren & { requireConnection?: boolean }) {
	const location = useLocation();
	const connected = useSubject(personalNode?.connectedSub);
	const isFirstConnection = useSubject(personalNode?.isFirstConnection);

	// if there is no node connection, setup a connection
	if (!personalNode)
		return <Navigate to="/connect" replace state={{ back: (location.state?.back ?? location) satisfies To }} />;

	if (personalNode && isFirstConnection && connected === false) return <InitialConnectionOverlay />;

	return <>{children}</>;
}
