import {
	Alert,
	AlertDescription,
	AlertIcon,
	AlertTitle,
	Button,
	ButtonGroup,
	Code,
	Flex,
	Heading,
	Switch,
} from '@chakra-ui/react';
import { Outlet } from 'react-router-dom';

import { useBreakpointValue } from '../../providers/global/breakpoint-provider';
import useScrapperStatusReport from '../../hooks/reports/use-scrapper-status-report';
import { controlApi } from '../../services/personal-node';
import useReceiverStatusReport from '../../hooks/reports/use-receiver-status-report';

export default function NetworkView() {
	const isMobile = useBreakpointValue({ base: true, lg: false });

	const scrapper = useScrapperStatusReport();
	const receiver = useReceiverStatusReport();

	if (isMobile) return <Outlet />;

	return (
		<Flex overflow="hidden" flex={1} direction={{ base: 'column', lg: 'row' }}>
			<Flex
				overflowY="auto"
				overflowX="hidden"
				h="full"
				maxW={{ base: 'none', lg: 'md' }}
				minW={{ base: 'none', lg: 'md' }}
				direction="column"
				borderRightWidth={1}
			>
				<Flex
					direction="column"
					gap="2"
					p="4"
					backgroundPosition="center"
					backgroundRepeat="no-repeat"
					backgroundSize="cover"
					position="relative"
				></Flex>
				<Flex direction="column" p="2" gap="2">
					<Switch
						isChecked={scrapper?.running ?? false}
						onChange={() => controlApi?.send(['CONTROL', 'SCRAPPER', scrapper?.running ? 'STOP' : 'START'])}
						isDisabled={!scrapper}
					>
						Scrapper
					</Switch>
					<Code whiteSpace="pre">{JSON.stringify(scrapper, null, 2)}</Code>

					{/* NOTE: this is temporary till the receiver has its own view */}
					<Heading size="sm">Receiver ({receiver?.status})</Heading>
					<ButtonGroup size="sm">
						<Button
							colorScheme="green"
							isDisabled={receiver?.status === 'starting' || receiver?.status === 'running'}
							onClick={() => controlApi?.send(['CONTROL', 'RECEIVER', 'START'])}
						>
							Start
						</Button>
						<Button
							isDisabled={receiver?.status !== 'running'}
							onClick={() => controlApi?.send(['CONTROL', 'RECEIVER', 'STOP'])}
							colorScheme="red"
						>
							Stop
						</Button>
					</ButtonGroup>
					{receiver?.startError && (
						<Alert status="error">
							<AlertIcon />
							<AlertTitle>Failed to start!</AlertTitle>
							<AlertDescription>{receiver.startError}</AlertDescription>
						</Alert>
					)}
				</Flex>
			</Flex>
			<Flex flexDirection="column" w="full" overflow="hidden">
				<Outlet />
			</Flex>
		</Flex>
	);
}
