import { Flex } from '@chakra-ui/react';
import { Outlet, useMatch } from 'react-router-dom';

import useParamsProfilePointer from '../../hooks/use-params-pubkey-pointer';
import { useBreakpointValue } from '../../providers/global/breakpoint-provider';
import ErrorBoundary from '../../components/error-boundary';
import SideMenu from './components/side-menu';

function UserProfilePage({ pubkey }: { pubkey: string }) {
	const match = useMatch('/profile/:address');
	const isMobile = useBreakpointValue({ base: true, lg: false });
	const showMenu = !isMobile || !!match;

	if (showMenu) {
		return (
			<Flex overflow="hidden" flex={1} direction={{ base: 'column', lg: 'row' }}>
				<SideMenu pubkey={pubkey} />
				{!isMobile && (
					<ErrorBoundary>
						<Outlet />
					</ErrorBoundary>
				)}
			</Flex>
		);
	}

	return (
		<ErrorBoundary>
			<Outlet />
		</ErrorBoundary>
	);
}

export default function UserProfileView() {
	const pointer = useParamsProfilePointer();

	return <UserProfilePage pubkey={pointer.pubkey} />;
}
