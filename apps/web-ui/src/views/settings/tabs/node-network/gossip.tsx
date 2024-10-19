import { CloseIcon } from '@chakra-ui/icons';
import { Button, Code, Flex, Heading, IconButton, Input, Link, Select, Switch, Text } from '@chakra-ui/react';

import useSubject from '../../../../hooks/use-subject';
import { controlApi } from '../../../../services/personal-node';
import { RelayFavicon } from '../../../../components/relay-favicon';
import useAsyncErrorHandler from '../../../../hooks/use-async-error-handler';
import { useForm } from 'react-hook-form';
import { safeRelayUrl } from 'applesauce-core/helpers';
import { useRouteStateBoolean } from '../../../../hooks/use-route-state-value';

function BroadcastRelay({ relay }: { relay: string }) {
	const config = useSubject(controlApi?.config);
	const remove = useAsyncErrorHandler(async () => {
		if (!config) return;

		await controlApi?.setConfigField(
			'gossipBroadcastRelays',
			config.gossipBroadcastRelays.filter((r) => r !== relay),
		);
	}, [relay, config?.gossipBroadcastRelays]);

	return (
		<Flex key={relay} gap="2" alignItems="center" overflow="hidden" borderWidth={1} p="2" rounded="md">
			<RelayFavicon relay={relay} size="xs" />
			<Text isTruncated>{relay}</Text>
			<IconButton
				aria-label="Remove Relay"
				icon={<CloseIcon />}
				size="xs"
				ml="auto"
				colorScheme="red"
				variant="ghost"
				onClick={remove}
			/>
		</Flex>
	);
}

function AddRelayForm() {
	const config = useSubject(controlApi?.config);
	const { register, handleSubmit, reset } = useForm({ defaultValues: { url: '' } });

	const submit = handleSubmit((values) => {
		if (!config) return;
		const url = safeRelayUrl(values.url);
		if (url) controlApi?.setConfigField('gossipBroadcastRelays', [...config.gossipBroadcastRelays, url]);

		reset();
	});

	return (
		<Flex as="form" onSubmit={submit} gap="2">
			<Input type="url" {...register('url', { required: true })} isRequired placeholder="wss://gossip.example.com" />
			<Button type="submit" colorScheme="green">
				Add
			</Button>
		</Flex>
	);
}

function IntervalSelect() {
	const config = useSubject(controlApi?.config);

	return (
		<Select
			w="auto"
			value={config?.gossipInterval}
			onChange={(e) => {
				const i = parseInt(e.target.value);

				if (Number.isFinite(i)) controlApi?.setConfigField('gossipInterval', i);
			}}
		>
			<option value={60_000}>Every minute</option>
			<option value={10 * 60_000}>Every 10 min</option>
			<option value={30 * 60_000}>Every 30 min</option>
			<option value={60 * 60_000}>Every hour</option>
			<option value={24 * 60 * 60_000}>Every day</option>
		</Select>
	);
}

export default function GossipSettings() {
	const config = useSubject(controlApi?.config);

	return (
		<>
			<Flex alignItems="center" gap="2">
				<Heading size="md">Gossip</Heading>
				{config !== undefined && (
					<Switch
						isChecked={config?.gossipEnabled}
						onChange={(e) => controlApi?.setConfigField('gossipEnabled', e.currentTarget.checked)}
					>
						Enabled
					</Switch>
				)}
				{/* TODO: update this once nip-66 is merged */}
				<Link isExternal href="https://github.com/dskvr/nips/blob/nip-59-relay-status/66.md" color="GrayText" ml="auto">
					More Info
				</Link>
			</Flex>

			<Flex gap="2" justifyContent="space-between">
				<Text fontStyle="italic">Tell other relays and monitors how to reach this relay</Text>
				{config?.gossipEnabled && <IntervalSelect />}
			</Flex>

			{config?.gossipEnabled && (
				<>
					<AddRelayForm />

					<Flex direction="column" gap="2">
						{config?.gossipBroadcastRelays.map((relay) => <BroadcastRelay key={relay} relay={relay} />)}
					</Flex>
				</>
			)}
		</>
	);
}
