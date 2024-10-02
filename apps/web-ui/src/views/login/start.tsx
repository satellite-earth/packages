import { useCallback, useState } from 'react';
import { Button, Flex, FormControl, FormLabel, Input, Text, useToast } from '@chakra-ui/react';
import { useForm } from 'react-hook-form';
import { decrypt } from 'nostr-tools/nip49';
import { hexToBytes } from '@noble/hashes/utils';
import { getPublicKey } from 'nostr-tools';
import { isHexKey } from 'applesauce-core/helpers';
import { Link as RouterLink } from 'react-router-dom';

import { DEFAULT_NOSTR_CONNECT_RELAYS } from '../../const';
import accountService from '../../services/account';
import ExtensionAccount from '../../classes/accounts/extension-account';
import NostrConnectAccount from '../../classes/accounts/nostr-connect-account';
import { Account } from '../../classes/accounts/account';
import NsecAccount from '../../classes/accounts/nsec-account';
import PasswordAccount from '../../classes/accounts/password-account';
import NostrConnectSigner from '../../classes/signers/nostr-connect-signer';
import PuzzlePiece01 from '../../components/icons/components/puzzle-piece-01';
import Diamond01 from '../../components/icons/components/diamond-01';
import nostrConnectService from '../../services/nostr-connect';
import Package from '../../components/icons/components/package';
import { safeDecode } from '../../helpers/nip19';

const isAndroid = navigator.userAgent.includes('Android');

function ClientSideNostrConnectButton() {
	const [connecting, setConnecting] = useState(false);
	const connect = useCallback(() => {
		setConnecting(true);
		const signer = new NostrConnectSigner(undefined, DEFAULT_NOSTR_CONNECT_RELAYS);

		signer.listen().then(() => {
			nostrConnectService.saveSigner(signer);
			accountService.addAccount(new NostrConnectAccount(signer.pubkey!, signer));
			accountService.switchAccount(signer.pubkey!);
			setConnecting(false);
		});

		const host = location.protocol + '//' + location.host;
		const params = new URLSearchParams();
		params.set('relay', DEFAULT_NOSTR_CONNECT_RELAYS[0]);
		params.set('name', 'Satellite');
		params.set('url', host);
		params.set('image', new URL('/apple-touch-icon.png', host).toString());

		const url = `nostrconnect://${signer.publicKey}?` + params.toString();
		window.open(url);

		return signer;
	}, []);

	return (
		<Button flexDirection="column" h="auto" w="32" p="4" onClick={connect} variant="outline" isLoading={connecting}>
			<Diamond01 boxSize={12} mb="1" />
			Amber
		</Button>
	);
}

function ExtensionButton() {
	const toast = useToast();
	const [loading, setLoading] = useState(false);

	const loginWithExtension = async () => {
		if (window.nostr) {
			try {
				setLoading(true);

				const account = await ExtensionAccount.fromExtension();
				accountService.addAccount(account);
				accountService.switchAccount(account.pubkey);
			} catch (e) {
				if (e instanceof Error) toast({ description: e.message, status: 'error' });
			}
			setLoading(false);
		} else {
			toast({ status: 'warning', title: 'Cant find extension' });
		}
	};

	return (
		<Button flexDirection="column" h="auto" w="32" p="4" onClick={loginWithExtension} variant="outline">
			<PuzzlePiece01 boxSize={12} mb="1" />
			Extension
		</Button>
	);
}

function LoginForm() {
	const { register, handleSubmit, formState } = useForm({ defaultValues: { value: '' }, mode: 'all' });

	const submit = handleSubmit(async ({ value }) => {
		let account: Account;
		if (isHexKey(value)) {
			account = NsecAccount.fromKey(hexToBytes(value));
		} else if (value.startsWith('ncryptsec')) {
			const password = window.prompt('Decryption password');
			if (password === null) throw new Error('Password required');
			const key = decrypt(value, password);
			account = PasswordAccount.fromNcryptsec(getPublicKey(key), value);
		} else if (value.startsWith('nsec')) {
			const decode = safeDecode(value);
			if (decode?.type !== 'nsec') throw new Error();
			const key = decode.data;

			const password = window.prompt('Local encryption password. This password is used to keep your secret key safe');
			if (password) {
				const a = new PasswordAccount(getPublicKey(key));
				a.signer.key = key;
				a.signer.setPassword(password);
				account = a;
			} else {
				account = NsecAccount.fromKey(decode.data);
			}
		} else throw new Error('Invalid key');

		accountService.addAccount(account);
		accountService.switchAccount(account.pubkey);
	});

	return (
		<Flex as="form" onSubmit={submit} w="full" gap="2">
			<FormControl>
				<FormLabel>Private key or Nostr Connect URI</FormLabel>
				<Flex gap="2">
					<Input
						placeholder="nsec, ncryptsec or bunker url"
						{...register('value', { required: true })}
						isRequired
						autoComplete="off"
					/>
					{formState.isDirty && (
						<Button type="submit" isLoading={formState.isLoading}>
							Login
						</Button>
					)}
				</Flex>
			</FormControl>
		</Flex>
	);
}

export default function LoginStartView() {
	return (
		<>
			<LoginForm />
			<Text>OR</Text>
			<Flex gap="2" wrap="wrap" justifyContent="center">
				{window.nostr && <ExtensionButton />}
				{isAndroid && <ClientSideNostrConnectButton />}
				<Button
					as={RouterLink}
					to="/login/nostr-connect"
					flexDirection="column"
					h="auto"
					w="32"
					p="4"
					variant="outline"
				>
					<Package boxSize={12} mb="1" />
					Nostr Connect
				</Button>
			</Flex>
		</>
	);
}
