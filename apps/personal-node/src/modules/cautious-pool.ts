import EventEmitter from 'events';
import { SimplePool, VerifiedEvent } from 'nostr-tools';
import { AbstractRelay } from 'nostr-tools/relay';
import { normalizeURL } from 'nostr-tools/utils';

import { logger } from '../logger.js';

export type TestRelay = (relay: AbstractRelay, challenge: string) => boolean;

type EventMap = {
	challenge: [AbstractRelay, string];
	connected: [AbstractRelay];
	closed: [AbstractRelay];
};

export default class CautiousPool extends SimplePool {
	log = logger.extend('CautiousPool');
	isSelf?: TestRelay;
	blacklist = new Set<string>();

	challenges = new Map<string, string>();
	authenticated = new Map<string, boolean>();

	emitter = new EventEmitter<EventMap>();
	constructor(isSelf?: TestRelay) {
		super();

		this.isSelf = isSelf;
	}

	async ensureRelay(url: string, params?: { connectionTimeout?: number }): Promise<AbstractRelay> {
		url = normalizeURL(url);

		const parsed = new URL(url);
		if (parsed.host === 'localhost' || parsed.host === '127.0.0.1') throw new Error('Cant connect to localhost');

		if (this.blacklist.has(url)) throw new Error('Cant connect to self');

		const relay = await super.ensureRelay(url, params);
		if (this.checkRelay(relay)) throw new Error('Cant connect to self');

		this.emitter.emit('connected', relay);

		relay._onauth = (challenge) => {
			if (this.checkRelay(relay, challenge)) {
				this.authenticated.set(relay.url, false);
				this.challenges.set(relay.url, challenge);
				this.emitter.emit('challenge', relay, challenge);
			}
		};

		relay.onnotice = () => {};

		relay.onclose = () => {
			this.challenges.delete(relay.url);
			this.authenticated.delete(relay.url);
			this.emitter.emit('closed', relay);
		};

		return relay;
	}

	private checkRelay(relay: AbstractRelay, challenge?: string) {
		// @ts-expect-error
		challenge = challenge || relay.challenge;

		if (challenge) {
			if (this.isSelf && this.isSelf(relay, challenge)) {
				this.log(`Found ${relay.url} connects to ourselves, adding to blacklist`);
				this.blacklist.add(relay.url);
				relay.close();
				relay.connect = () => {
					throw new Error('Cant connect to self');
				};
				return true;
			}
		}

		return false;
	}

	isAuthenticated(relay: string | AbstractRelay) {
		return !!this.authenticated.get(typeof relay === 'string' ? relay : relay.url);
	}

	async authenticate(url: string | AbstractRelay, auth: VerifiedEvent) {
		const relay = typeof url === 'string' ? await this.ensureRelay(url) : url;

		return await relay.auth(async (draft) => auth);
	}

	[Symbol.iterator](): IterableIterator<[string, AbstractRelay]> {
		return this.relays[Symbol.iterator]();
	}
}
