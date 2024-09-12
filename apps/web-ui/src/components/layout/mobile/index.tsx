import { Outlet, ScrollRestoration } from 'react-router-dom';

import NotificationsPrompt from '../notifications-prompt';
import ConnectionStatus from '../connection-status';
import MobileBottomNav from './bottom-nav';
import { PersistentSubject } from '../../../classes/subject';
import useSubject from '../../../hooks/use-subject';
import ErrorBoundary from '../../error-boundary';

export const showMobileNav = new PersistentSubject(true);

export default function MobileLayout() {
	const showNav = useSubject(showMobileNav);

	return (
		<>
			<ScrollRestoration />
			<ConnectionStatus />
			<NotificationsPrompt />
			<ErrorBoundary>
				<Outlet />
			</ErrorBoundary>
			{showNav && <MobileBottomNav />}
		</>
	);
}
