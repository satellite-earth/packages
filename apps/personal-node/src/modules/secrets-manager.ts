import _throttle from 'lodash.throttle';
import { generateSecretKey } from 'nostr-tools';
import EventEmitter from 'events';
import { bytesToHex, hexToBytes } from '@noble/hashes/utils';
import webPush from 'web-push';
import crypto from 'crypto';
import fs from 'fs';

import { logger } from '../logger.js';

type Secrets = {
	nostrKey: Uint8Array;
	vapidPrivateKey: string;
	vapidPublicKey: string;
	hyperKey: Buffer;
	i2pPrivateKey?: string;
	i2pPublicKey?: string;
};
type RawJson = Partial<{
	nostrKey: string;
	vapidPrivateKey: string;
	vapidPublicKey: string;
	hyperKey: string;
	i2pPrivateKey?: string;
	i2pPublicKey?: string;
}>;

type EventMap = {
	/** fires when file is loaded */
	loaded: [];
	/** fires when a field is set */
	changed: [keyof Secrets, any];
	/** fires when file is loaded or changed */
	updated: [];
	saved: [];
};

export default class SecretsManager extends EventEmitter<EventMap> {
	log = logger.extend('SecretsManager');
	protected secrets?: Secrets;
	path: string;

	constructor(path: string) {
		super();
		this.path = path;
	}

	get<T extends keyof Secrets>(secret: T): Secrets[T] {
		if (!this.secrets) throw new Error('Secrets not loaded');
		return this.secrets[secret];
	}
	set<T extends keyof Secrets>(secret: T, value: Secrets[T]) {
		if (!this.secrets) throw new Error('Secrets not loaded');
		this.secrets[secret] = value;

		this.emit('changed', secret, value);
		this.emit('updated');
		this.write();
	}

	read() {
		this.log('Loading secrets');

		let json: Record<string, any> = {};

		try {
			json = JSON.parse(fs.readFileSync(this.path, { encoding: 'utf-8' }));
		} catch (error) {}

		let changed = false;

		const secrets = {} as Secrets;

		if (!json.nostrKey) {
			this.log('Generating new nostr key');
			secrets.nostrKey = generateSecretKey();
			changed = true;
		} else secrets.nostrKey = hexToBytes(json.nostrKey);

		if (!json.vapidPrivateKey || !json.vapidPublicKey) {
			this.log('Generating new vapid key');
			const keys = webPush.generateVAPIDKeys();
			secrets.vapidPrivateKey = keys.privateKey;
			secrets.vapidPublicKey = keys.publicKey;
			changed = true;
		} else {
			secrets.vapidPrivateKey = json.vapidPrivateKey;
			secrets.vapidPublicKey = json.vapidPublicKey;
		}

		if (!json.hyperKey) {
			this.log('Generating new hyper key');
			secrets.hyperKey = crypto.randomBytes(32);
			changed = true;
		} else secrets.hyperKey = Buffer.from(json.hyperKey, 'hex');

		secrets.i2pPrivateKey = json.i2pPrivateKey;
		secrets.i2pPublicKey = json.i2pPublicKey;

		this.secrets = secrets;

		this.emit('loaded');
		this.emit('updated');

		if (changed) this.write();
	}
	write() {
		if (!this.secrets) throw new Error('Secrets not loaded');

		this.log('Saving');

		const json: RawJson = {
			nostrKey: bytesToHex(this.secrets?.nostrKey),
			vapidPrivateKey: this.secrets.vapidPrivateKey,
			vapidPublicKey: this.secrets.vapidPublicKey,
			hyperKey: this.secrets.hyperKey?.toString('hex'),
			i2pPrivateKey: this.secrets.i2pPrivateKey,
			i2pPublicKey: this.secrets.i2pPublicKey,
		};

		fs.writeFileSync(this.path, JSON.stringify(json, null, 2), { encoding: 'utf-8' });

		this.emit('saved');
	}
}
