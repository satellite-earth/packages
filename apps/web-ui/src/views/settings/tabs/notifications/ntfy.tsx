import { useEffect, useState } from 'react';
import { Alert, Button, Code, Flex, Heading, Link, Spinner, Text } from '@chakra-ui/react';
import { nanoid } from 'nanoid';
import { kinds, NostrEvent } from 'nostr-tools';

import personalNode, { controlApi } from '../../../../services/personal-node';
import useCurrentAccount from '../../../../hooks/use-current-account';
import useSubject from '../../../../hooks/use-subject';
import { deviceId, ntfyServer, ntfyTopic } from '../../../../services/preferences';
import { ExternalLinkIcon } from '@chakra-ui/icons';
import useNotificationChannelsReport from '../../../../hooks/reports/use-notification-channels';
import { CopyIconButton } from '../../../../components/copy-icon-button';

export default function NtfyNotificationSettings() {
	const account = useCurrentAccount();

	const device = useSubject(deviceId);
	const topic = useSubject(ntfyTopic);
	const server = useSubject(ntfyServer);
	const { channels } = useNotificationChannelsReport();

	const channel = Object.values(channels || {}).find((c) => c.device === device && c.type === 'ntfy');

	const enable = () => {
		const topic = nanoid();
		// generate a new random id
		ntfyTopic.next(topic);

		controlApi?.send([
			'CONTROL',
			'NOTIFICATIONS',
			'REGISTER',
			{ id: `ntfy:${topic}`, server, topic, type: 'ntfy', device },
		]);
	};

	const disable = () => {
		if (!channel) return;

		controlApi?.send(['CONTROL', 'NOTIFICATIONS', 'UNREGISTER', channel.id]);
	};

	const [testing, setTesting] = useState(false);
	const test = async () => {
		if (!account) return;
		setTesting(true);

		const events: NostrEvent[] = [];
		await new Promise<void>((res) => {
			const sub = personalNode?.subscribe(
				[{ kinds: [kinds.EncryptedDirectMessage], limit: 10, '#p': [account.pubkey] }],
				{
					onevent: (event) => {
						events.push(event);
					},
					oneose: () => {
						const random = events[Math.round((events.length - 1) * Math.random())];
						controlApi?.send(['CONTROL', 'NOTIFICATIONS', 'NOTIFY', random.id]);
						res();
					},
				},
			);
		});

		setTesting(false);
	};

	if (!topic) return <Spinner />;

	return (
		<>
			<Flex alignItems="center" gap="2">
				<Heading size="md">Ntfy Notifications</Heading>
				<Link isExternal href="https://ntfy.sh/" color="GrayText" ml="auto">
					More Info
				</Link>
			</Flex>

			<Text>
				Ntfy notifications use an external app to send notifications to your device. you can find instructions on
				setting up the app{' '}
				<Link color="blue.500" isExternal href="https://ntfy.sh/">
					here
				</Link>
			</Text>

			{channel ? (
				<>
					<Flex gap="2">
						<Code p="2" userSelect="all" w="full" rounded="md">
							{topic}
						</Code>
						<CopyIconButton value={topic} aria-label="Copy topic" />
					</Flex>
					<Flex gap="2" mt="2">
						<Button onClick={disable} colorScheme="orange">
							Disable
						</Button>
						<Button ml="auto" onClick={test} isLoading={testing}>
							Test
						</Button>
						<Button
							as={Link}
							href={`ntfy://${new URL(server).host}/${topic}`}
							colorScheme="green"
							isExternal
							rightIcon={<ExternalLinkIcon />}
						>
							Setup Ntfy
						</Button>
					</Flex>
				</>
			) : (
				<Alert status="info" whiteSpace="pre-wrap">
					Enable Ntfy notifications
					<Button variant="ghost" onClick={enable} ml="auto">
						Enable
					</Button>
				</Alert>
			)}
		</>
	);
}
