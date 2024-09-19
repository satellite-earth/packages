import { Suspense } from 'react';
import { ChakraProvider } from '@chakra-ui/react';
import ErrorBoundary from './components/error-boundary';
import { RouterProvider, createBrowserRouter } from 'react-router-dom';

import './styles.css';

import { theme } from './theme';
import { GlobalProviders } from './providers/global';

import LoginView from './views/login';
import LoginStartView from './views/login/start';
import AppLayout from './components/layout';
import ConnectView from './views/connect';
import NetworkView from './views/network';
import OverviewList from './views/network/components/overview-list';
import PersonalNodeAuthView from './views/connect/auth';
import MessagesView from './views/messages';
import DirectMessageConversationView from './views/messages/conversation';
import RequirePersonalNode from './components/router/require-personal-node';
import RequireCurrentAccount from './components/router/require-current-account';
import RequirePersonalNodeAuth from './components/router/require-personal-node-auth';
import RequireDesktopSetup from './components/router/require-desktop-setup';
import HomeView from './views/home';
import SettingsView from './views/settings';
import PersonalNodeSetupView from './views/setup';
import ConnectionStatus from './components/layout/connection-status';
import NostrConnectView from './views/login/nostr-connect';
import UserProfileView from './views/profile';
import SearchView from './views/search';
import DisplaySettingsView from './views/settings/tabs/display-settings';
import NodeGeneralSettingsView from './views/settings/tabs/node-settings';
import NotificationSettingsView from './views/settings/tabs/notifications';
import UserArticlesView from './views/profile/articles';
import UserSummaryView from './views/profile/summary';
import ServiceLogsView from './views/settings/tabs/service-logs';
import NodeNetworkSettingsView from './views/settings/tabs/node-network';
import UserNotesView from './views/profile/notes';

const router = createBrowserRouter([
	{
		path: 'login',
		element: <LoginView />,
		children: [
			{ path: '', element: <LoginStartView /> },
			{ path: 'nostr-connect', element: <NostrConnectView /> },
		],
	},
	{
		path: 'connect',
		children: [
			{ path: '', element: <ConnectView /> },
			{
				path: 'auth',
				element: (
					<RequirePersonalNode>
						<ConnectionStatus />
						<PersonalNodeAuthView />
					</RequirePersonalNode>
				),
			},
		],
	},
	{
		path: 'setup',
		element: <PersonalNodeSetupView />,
	},
	{
		path: 'network',
		element: (
			<RequirePersonalNode>
				<RequirePersonalNodeAuth>
					<AppLayout />
				</RequirePersonalNodeAuth>
			</RequirePersonalNode>
		),
		children: [
			{
				path: '',
				element: <NetworkView />,
				children: [
					{
						path: '',
						element: <OverviewList />,
					},
				],
			},
		],
	},
	{
		path: '',
		element: (
			<RequirePersonalNode>
				<RequireCurrentAccount>
					<RequirePersonalNodeAuth>
						<AppLayout />
					</RequirePersonalNodeAuth>
				</RequireCurrentAccount>
			</RequirePersonalNode>
		),
		children: [
			{
				path: 'messages',
				element: <MessagesView />,
				children: [
					{
						path: 'p/:pubkey',
						element: <DirectMessageConversationView />,
					},
				],
			},
			{
				path: 'profile/:pubkey',
				element: <UserProfileView />,
				children: [
					{ path: '', element: <UserSummaryView /> },
					{ path: 'summary', element: <UserSummaryView /> },
					{ path: 'messages', element: <DirectMessageConversationView /> },
					{ path: 'notes', element: <UserNotesView /> },
					{ path: 'articles', element: <UserArticlesView /> },
				],
			},
			{
				path: 'search',
				element: <SearchView />,
			},
			{
				path: 'settings',
				element: <SettingsView />,
				children: [
					{ path: '', element: <DisplaySettingsView /> },
					{ path: 'display', element: <DisplaySettingsView /> },
					{ path: 'notifications', element: <NotificationSettingsView /> },
					{
						path: 'node-settings',
						element: (
							<RequirePersonalNodeAuth>
								<NodeGeneralSettingsView />
							</RequirePersonalNodeAuth>
						),
					},
					{
						path: 'node-network',
						element: (
							<RequirePersonalNodeAuth>
								<NodeNetworkSettingsView />
							</RequirePersonalNodeAuth>
						),
					},
					{ path: 'logs', element: <ServiceLogsView /> },
				],
			},
			{
				path: '',
				element: <HomeView />,
			},
		],
	},
]);

const App = () => (
	<ErrorBoundary>
		<ChakraProvider theme={theme}>
			<GlobalProviders>
				<Suspense fallback={<h1>Loading...</h1>}>
					<RequireDesktopSetup>
						<RouterProvider router={router} />
					</RequireDesktopSetup>
				</Suspense>
			</GlobalProviders>
		</ChakraProvider>
	</ErrorBoundary>
);

export default App;
