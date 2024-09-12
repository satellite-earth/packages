import { Flex, Tab, TabList, TabPanel, TabPanels, Tabs } from '@chakra-ui/react';
import { Outlet } from 'react-router-dom';

import CommunityContextProvider from '../../providers/local/community-provider';
import ErrorBoundary from '../../components/error-boundary';
import useSubject from '../../hooks/use-subject';
import communitiesService from '../../services/communities';
import DesktopChannelNav from '../../components/layout/desktop/channel-nav';
import MobileChannelNav from '../../components/layout/mobile/channel-nav';
import CommunityAbout from '../../components/layout/mobile/community-about';
import MobileCommunityButton from '../../components/layout/mobile/community-button';
import { useBreakpointValue } from '../../providers/global/breakpoint-provider';

export default function CommunityView() {
	const mobile = useBreakpointValue({ base: true, md: false });
	const community = useSubject(communitiesService.community);
	const communities = useSubject(communitiesService.communities);

	if (community) {
		if (mobile)
			return (
				<Tabs h="full" overflow="hidden">
					<TabList>
						<Tab>Channels</Tab>
						<Tab>About</Tab>
					</TabList>

					<TabPanels>
						<TabPanel p="0">
							<MobileChannelNav community={community} />
						</TabPanel>
						<TabPanel p="0">
							<CommunityAbout community={community} />
						</TabPanel>
					</TabPanels>
				</Tabs>
			);
		else
			return (
				<>
					<CommunityContextProvider community={community}>
						<DesktopChannelNav />
						<Flex direction="column" overflow="hidden" grow={1}>
							<ErrorBoundary>
								<Outlet />
							</ErrorBoundary>
						</Flex>
					</CommunityContextProvider>
				</>
			);
	} else if (mobile) {
		return (
			<Flex direction="column">
				{communities.map((community) => (
					<MobileCommunityButton community={community} key={community.id} />
				))}
			</Flex>
		);
	}

	return null;
}
