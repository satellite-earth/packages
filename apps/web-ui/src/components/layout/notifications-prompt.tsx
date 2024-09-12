import { Alert, AlertDescription, AlertIcon, AlertTitle, Button, CloseButton } from '@chakra-ui/react';
import { Link as RouterLink, useMatch } from 'react-router-dom';
import { useLocalStorage } from 'react-use';

import { IS_SATELLITE_DESKTOP } from '../../env';

export default function NotificationsPrompt() {
	const match = useMatch('/settings/*');
	const [hide, setHide] = useLocalStorage('hide-request-notifications', false);

	if (match) return null;
	if (hide || IS_SATELLITE_DESKTOP) return null;

	return (
		<Alert status="info" flexWrap="wrap" gap="2" overflow="visible">
			<AlertIcon />
			<AlertTitle>Enable Notifications</AlertTitle>
			<AlertDescription>get notifications when you receive a new direct message</AlertDescription>
			<Button as={RouterLink} size="sm" to="/settings/notifications" ml={{ base: 0, sm: '2' }} colorScheme="green">
				Setup Notifications
			</Button>
			<CloseButton
				alignSelf="flex-start"
				position="relative"
				right={-1}
				top={-1}
				onClick={() => setHide(true)}
				ml="auto"
			/>
		</Alert>
	);
}
