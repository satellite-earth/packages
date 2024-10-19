import { Box, Divider, Flex } from '@chakra-ui/react';

import SimpleView from '../../../../components/layout/presets/simple-view';
import HyperNetworkStatus from './hyper';
import TorNetworkStatus from './tor';
import I2PNetworkStatus from './i2p';
import GossipSettings from './gossip';

export default function NodeNetworkSettingsView() {
	return (
		<SimpleView title="Network Settings">
			<Flex direction="column" maxW="2xl" gap="4">
				<HyperNetworkStatus />
				<Box px="4">
					<Divider />
				</Box>
				<TorNetworkStatus />
				<Box px="4">
					<Divider />
				</Box>
				<I2PNetworkStatus />
				<Box px="4">
					<Divider />
				</Box>
				<GossipSettings />
			</Flex>
		</SimpleView>
	);
}
