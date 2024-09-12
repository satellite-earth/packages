import { useEffect, useMemo, useState } from 'react';
import NostrConnectSigner from '../../classes/signers/nostr-connect-signer';
import { Button, Flex, FormControl, Input, Link, Text, useToast } from '@chakra-ui/react';
import { Link as RouterLink } from 'react-router-dom';
import { useForm } from 'react-hook-form';

import { DEFAULT_NOSTR_CONNECT_RELAYS } from '../../const';
import nostrConnectService from '../../services/nostr-connect';
import NostrConnectAccount from '../../classes/accounts/nostr-connect-account';
import accountService from '../../services/account';
import QrCodeSvg from '../../components/qr-code/qr-code-svg';
import { ChevronLeftIcon } from '../../components/icons';
import QRCodeScannerButton from '../../components/qr-code/qr-code-scanner-button';

export default function NostrConnectView() {
	const toast = useToast();
	const [connecting, setConnecting] = useState(true);
	const [signer] = useState(() => new NostrConnectSigner(undefined, DEFAULT_NOSTR_CONNECT_RELAYS));
	const [manual, setManual] = useState(false);

	useEffect(() => {
		signer.listen().then(() => {
			nostrConnectService.saveSigner(signer);
			accountService.addAccount(new NostrConnectAccount(signer.pubkey!, signer));
			accountService.switchAccount(signer.pubkey!);
			setConnecting(false);
		});

		return () => {
			// if the signer is not connected, close it
			if (!signer.pubkey) signer.close();
		};
	}, [signer]);

	const connectURI = useMemo(() => {
		const host = location.protocol + '//' + location.host;
		const params = new URLSearchParams();
		params.set('relay', signer.relays[0]);
		params.set('name', 'Satellite');
		params.set('url', host);
		params.set('image', 'https://app.satellite.earth/logo-192x192.png');

		return `nostrconnect://${signer.publicKey}?` + params.toString();
	}, []);

	const { register, handleSubmit, setValue } = useForm({ defaultValues: { uri: '' } });

	const connect = handleSubmit(async ({ uri }) => {
		setConnecting(true);
		try {
			let client: NostrConnectSigner;
			if (uri.startsWith('bunker://')) {
				if (uri.includes('@')) client = nostrConnectService.fromBunkerAddress(uri);
				else client = nostrConnectService.fromBunkerURI(uri);

				await client.connect(new URL(uri).searchParams.get('secret') ?? undefined);
			} else if (uri.startsWith('npub')) {
				client = nostrConnectService.fromBunkerToken(uri);
				const [npub, hexToken] = uri.split('#');
				await client.connect(hexToken);
			} else throw new Error('Unknown format');

			nostrConnectService.saveSigner(client);
			const account = new NostrConnectAccount(client.pubkey!, client);
			accountService.addAccount(account);
			accountService.switchAccount(client.pubkey!);
		} catch (error) {
			if (error instanceof Error) toast({ status: 'error', description: error.message });
		}
		setConnecting(false);
	});

	return (
		<>
			{manual ? (
				<>
					<Flex as="form" w="full" direction="column" gap="2" onSubmit={connect}>
						<FormControl>
							<Flex gap="2">
								<Input placeholder="bunkder://npub..." {...register('uri')} />
								<QRCodeScannerButton onData={(v) => setValue('uri', v)} />
							</Flex>
						</FormControl>
						<Flex gap="2" justifyContent="space-between">
							<Button leftIcon={<ChevronLeftIcon boxSize={6} />} onClick={() => setManual(false)}>
								Back
							</Button>
							<Button ml="auto" colorScheme="brand">
								Connect
							</Button>
						</Flex>
					</Flex>
				</>
			) : (
				<>
					<Flex justifyContent="space-between" gap="2" w="full">
						<Button as={RouterLink} to="/login" leftIcon={<ChevronLeftIcon boxSize={6} />}>
							Back
						</Button>
						<Button onClick={() => setManual(true)}>Use bunker URI</Button>
					</Flex>
					<Link href={connectURI} w="full">
						<QrCodeSvg content={connectURI} />
					</Link>
					<Button as={Link} href={connectURI} w="full" colorScheme="brand">
						Open signer app
					</Button>
					{connecting && (
						<Text fontSize="lg" mt="2">
							Waiting for connection...
						</Text>
					)}
				</>
			)}
		</>
	);
}
