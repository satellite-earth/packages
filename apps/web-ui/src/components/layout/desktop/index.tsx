import { Flex } from '@chakra-ui/react';
import { Outlet, ScrollRestoration } from 'react-router-dom';

import DesktopSideNav from './side-nav';
import ErrorBoundary from '../../error-boundary';
import NotificationsPrompt from '../notifications-prompt';
import ConnectionStatus from '../connection-status';

export default function DesktopLayout() {
	return (
		<>
			<ScrollRestoration />
			<ConnectionStatus />
			<NotificationsPrompt />
			<Flex
				direction={{
					base: 'column',
					md: 'row',
				}}
				overflow="hidden"
				h="full"
			>
				<DesktopSideNav />
				<ErrorBoundary>
					<Outlet />
				</ErrorBoundary>
			</Flex>
		</>
	);
}
