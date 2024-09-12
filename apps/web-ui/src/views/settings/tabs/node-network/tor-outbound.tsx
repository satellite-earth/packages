import { ReactNode } from 'react';
import { Alert, AlertIcon, FormControl, FormHelperText, Switch } from '@chakra-ui/react';

import useNetworkOverviewReport from '../../../../hooks/reports/use-network-status-report';
import useSubject from '../../../../hooks/use-subject';
import { controlApi } from '../../../../services/personal-node';

export default function TorOutboundStatus() {
	const config = useSubject(controlApi?.config);
	const status = useNetworkOverviewReport();

	let content: ReactNode = null;
	if (status === undefined) content = null;
	else if (!status.tor.outbound.available) {
		content = (
			<Alert status="warning">
				<AlertIcon />
				Outbound connections to Tor are not available
			</Alert>
		);
	} else if (status.tor.outbound.error) {
		content = (
			<Alert status="loading">
				<AlertIcon />
				Testing Tor proxy...
			</Alert>
		);
	} else if (!status.tor.outbound.running && config?.enableTorConnections) {
		content = (
			<Alert status="error">
				<AlertIcon />
				Tor proxy failed: {status.tor.outbound.error}
			</Alert>
		);
	}

	return (
		<>
			<FormControl>
				<Switch
					isChecked={config?.enableTorConnections}
					onChange={(e) =>
						controlApi?.send(['CONTROL', 'CONFIG', 'SET', 'enableTorConnections', e.currentTarget.checked])
					}
				>
					Connect to tor relays
				</Switch>
				<FormHelperText>Allows the node to connect to .onion domains</FormHelperText>
			</FormControl>
			{status?.tor.outbound.available && (
				<FormControl>
					<Switch
						isChecked={config?.routeAllTrafficThroughTor}
						onChange={(e) =>
							controlApi?.send(['CONTROL', 'CONFIG', 'SET', 'routeAllTrafficThroughTor', e.currentTarget.checked])
						}
					>
						Route all traffic through tor proxy
					</Switch>
					<FormHelperText>
						Routes all WebSocket and HTTP traffic through tor proxy. (This only applies to connections made by the node)
					</FormHelperText>
				</FormControl>
			)}
			{content}
		</>
	);
}
