import { hexToBytes } from '@noble/hashes/utils';
import { EventTemplate, NostrEvent, finalizeEvent, getPublicKey } from 'nostr-tools';
import { nip04 } from 'nostr-tools';

export default class Signer {
	secretKey: Uint8Array;
	publicKey: string;

	constructor(secretKey: string | Uint8Array) {
		this.secretKey = typeof secretKey === 'string' ? hexToBytes(secretKey) : secretKey;
		this.publicKey = getPublicKey(this.secretKey);
	}

	getPublicKey() {
		return this.publicKey;
	}

	async signEvent(template: EventTemplate): Promise<NostrEvent> {
		return finalizeEvent(template, this.secretKey);
	}
	async nip04Decrypt(pubkey: string, data: string) {
		return nip04.decrypt(this.secretKey, pubkey, data);
	}
	async nip04Encrypt(pubkey: string, plaintext: string) {
		return nip04.encrypt(this.secretKey, pubkey, plaintext);
	}
}
