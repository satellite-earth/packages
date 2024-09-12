import { Alert, AlertDescription, AlertTitle, Button, Flex, Text } from '@chakra-ui/react';
import { Link as RouterLink, useLocation } from 'react-router-dom';

import personalNode from '../../services/personal-node';
import WifiOff from '../icons/components/wifi-off';
import useSubject from '../../hooks/use-subject';
import useReconnectAction from '../../hooks/use-reconnect-action';

function ReconnectPrompt() {
	const location = useLocation();
	const { error, count } = useReconnectAction();

	return (
		<>
			<Alert status="info" flexWrap="wrap" gap="2" overflow="visible">
				<WifiOff color="blue.500" boxSize={6} />
				<AlertTitle>{count > 0 ? <>Reconnecting in {count}s...</> : <>Reconnecting...</>}</AlertTitle>
				<AlertDescription>trying to reconnect to personal node...</AlertDescription>
				<Flex gap="2">
					<Button as={RouterLink} to="/connect" replace state={{ back: location }} colorScheme="green" size="sm">
						Reconnect
					</Button>
					<Button as={RouterLink} to="/connect?config" state={{ back: location }} variant="link" size="sm" p="2">
						Change Node
					</Button>
				</Flex>

				{error && <Text color="red.500">{error.message}</Text>}
			</Alert>
		</>
	);
}

export default function ConnectionStatus() {
	const connected = useSubject(personalNode?.connectedSub);

	if (!personalNode || connected) return null;
	return <ReconnectPrompt />;
}
