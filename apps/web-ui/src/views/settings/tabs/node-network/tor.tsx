import { ReactNode } from 'react';
import { Flex, Heading, Link, Spinner } from '@chakra-ui/react';

import useSubject from '../../../../hooks/use-subject';
import { controlApi } from '../../../../services/personal-node';
import useNetworkOverviewReport from '../../../../hooks/reports/use-network-status-report';
import TorOutboundStatus from './tor-outbound';
import TorInboundStatus from './tor-inbound';

export default function TorNetworkStatus() {
	const config = useSubject(controlApi?.config);
	const status = useNetworkOverviewReport();

	let content: ReactNode = null;

	if (status === undefined || config === undefined) content = <Spinner />;
	else {
		content = (
			<>
				<TorOutboundStatus />
				<TorInboundStatus />
			</>
		);
	}

	return (
		<>
			<Flex alignItems="center" gap="2">
				<Heading size="md">Tor</Heading>
				<Link isExternal href="https://www.torproject.org/" color="GrayText" ml="auto">
					More Info
				</Link>
			</Flex>
			{content}
		</>
	);
}
