import Subject from '../classes/subject';
import _throttle from 'lodash.throttle';

import createDefer, { Deferred } from '../classes/deferred';
import signingService from './signing';
import accountService from './account';
import { controlApi } from './personal-node';
import { logger } from '../helpers/debug';

type EncryptionType = 'nip04' | 'nip44';

class DecryptionContainer {
	/** event id */
	id: string;
	type: 'nip04' | 'nip44';
	pubkey: string;
	cipherText: string;

	plaintext = new Subject<string>();
	error = new Subject<Error>();

	constructor(id: string, type: EncryptionType = 'nip04', pubkey: string, cipherText: string) {
		this.id = id;
		this.pubkey = pubkey;
		this.cipherText = cipherText;
		this.type = type;
	}
}

class DecryptionCache {
	containers = new Map<string, DecryptionContainer>();
	log = logger.extend('DecryptionCache');

	constructor() {
		controlApi?.on('message', (message) => {
			if (message[0] === 'CONTROL' && message[1] === 'DECRYPTION-CACHE') {
				switch (message[2]) {
					case 'CONTENT':
						this.handleHydration(message[3], message[4]);
						break;
					case 'END':
						this.handleHydrationEnd();
						break;
				}
			}
		});
	}

	getContainer(id: string) {
		return this.containers.get(id);
	}
	getOrCreateContainer(id: string, type: EncryptionType, pubkey: string, cipherText: string) {
		let container = this.containers.get(id);
		if (!container) {
			container = new DecryptionContainer(id, type, pubkey, cipherText);
			this.containers.set(id, container);
		}
		return container;
	}

	private async decryptContainer(container: DecryptionContainer) {
		const account = accountService.current.value;
		if (!account) throw new Error('Missing account');

		switch (container.type) {
			case 'nip04':
				return await signingService.nip04Decrypt(container.cipherText, container.pubkey, account);
			case 'nip44':
				return await signingService.nip44Decrypt(container.cipherText, container.pubkey, account);
		}
	}

	promises = new Map<DecryptionContainer, Deferred<string>>();

	hydrationSupported = !!controlApi;
	private hydrationQueue: DecryptionContainer[] = [];
	private pendingHydration = new Set<DecryptionContainer>();

	private requestHydrationThrottle = _throttle(this.requestHydration.bind(this), 500, { leading: false });
	private requestHydration() {
		if (!this.hydrationSupported || this.pendingHydration.size > 0 || this.hydrationQueue.length === 0) return;

		const ids = this.hydrationQueue.map((c) => c.id);
		this.pendingHydration = new Set(this.hydrationQueue);
		this.log(`Requesting hydration for ${ids.length} containers`);
		controlApi?.send(['CONTROL', 'DECRYPTION-CACHE', 'REQUEST', ids]);
		this.hydrationQueue = [];
	}
	private handleHydration(id: string, plaintext: string) {
		const container = this.getContainer(id);
		if (!container) return;

		container.plaintext.next(plaintext);
		this.pendingHydration.delete(container);

		const promise = this.promises.get(container);
		if (promise) {
			promise.resolve(plaintext);
			this.promises.delete(container);
		}
	}
	private handleHydrationEnd() {
		if (this.pendingHydration.size > 0) {
			this.log(`Unable to hydrate ${this.pendingHydration.size} containers`);

			// put any remaining containers into the decryption queue
			for (const container of this.pendingHydration) this.decryptQueue.unshift(container);

			this.pendingHydration.clear();
			this.startDecryptionQueue();
		}
	}

	private decryptQueue: DecryptionContainer[] = [];
	private decryptQueueRunning = false;
	private async decryptNext() {
		const container = this.decryptQueue.pop();
		if (!container) {
			this.decryptQueueRunning = false;
			this.decryptQueue = [];
			return;
		}

		const promise = this.promises.get(container)!;

		try {
			if (!container.plaintext.value) {
				const plaintext = await this.decryptContainer(container);

				// set plaintext
				container.plaintext.next(plaintext);
				promise.resolve(plaintext);

				// remove promise
				this.promises.delete(container);

				this.log(`Decrypted ${container.id}`);

				// send decrypted content
				if (this.hydrationSupported)
					controlApi?.send(['CONTROL', 'DECRYPTION-CACHE', 'ADD-CONTENT', container.id, plaintext]);
			}

			setTimeout(() => this.decryptNext(), 100);
		} catch (e) {
			if (e instanceof Error) {
				// set error
				container.error.next(e);
				promise.reject(e);

				// clear queue
				this.decryptQueueRunning = false;
				this.decryptQueue = [];
			}
		}
	}

	startDecryptionQueue() {
		if (!this.decryptQueueRunning) {
			this.decryptQueueRunning = true;
			this.decryptNext();
		}
	}

	requestDecrypt(container: DecryptionContainer) {
		if (container.plaintext.value) return Promise.resolve(container.plaintext.value);

		let p = this.promises.get(container);
		if (!p) {
			p = createDefer<string>();
			this.promises.set(container, p);

			if (this.hydrationSupported) {
				this.hydrationQueue.unshift(container);
				this.requestHydrationThrottle();
			} else {
				this.decryptQueue.unshift(container);
				this.startDecryptionQueue();
			}
		}
		return p;
	}

	requestHydrate(container: DecryptionContainer) {
		if (!this.hydrationSupported) return Promise.reject(new Error('Hydration not supported'));
		if (container.plaintext.value) return Promise.resolve(container.plaintext.value);

		let p = this.promises.get(container);
		if (!p) {
			p = createDefer<string>();
			this.promises.set(container, p);

			this.hydrationQueue.unshift(container);
			this.requestHydrationThrottle();
		}
		return p;
	}
}

const decryptionCacheService = new DecryptionCache();

if (import.meta.env.DEV) {
	// @ts-expect-error
	window.decryptionCacheService = decryptionCacheService;
}

export default decryptionCacheService;
