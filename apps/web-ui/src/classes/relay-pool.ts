import { Relay } from 'nostr-tools';
import dayjs from 'dayjs';

import { logger } from '../helpers/debug';
import { safeRelayUrl, validateRelayURL } from '../helpers/relay';
import Subject, { PersistentSubject } from './subject';
import SuperMap from './super-map';

export type Notice = {
	message: string;
	date: number;
};

export default class RelayPool {
	relays = new Map<string, Relay>();
	onRelayCreated = new Subject<Relay>();
	onRelayChallenge = new Subject<[Relay, string]>();

	notices = new SuperMap<Relay, PersistentSubject<Notice[]>>(() => new PersistentSubject<Notice[]>([]));

	relayClaims = new Map<string, Set<any>>();

	log = logger.extend('RelayPool');

	connectionErrors = new SuperMap<Relay, Error[]>(() => []);
	connecting = new SuperMap<Relay, PersistentSubject<boolean>>(() => new PersistentSubject(false));

	getRelay(relayOrUrl: string | URL | Relay) {
		if (typeof relayOrUrl === 'string') {
			const safeURL = safeRelayUrl(relayOrUrl);
			if (safeURL) {
				return this.relays.get(safeURL) || this.requestRelay(safeURL);
			} else return;
		} else if (relayOrUrl instanceof URL) {
			return this.relays.get(relayOrUrl.toString()) || this.requestRelay(relayOrUrl.toString());
		}

		return relayOrUrl;
	}

	getRelays(urls?: Iterable<string | URL | Relay>) {
		if (urls) {
			const relays: Relay[] = [];
			for (const url of urls) {
				const relay = this.getRelay(url);
				if (relay) relays.push(relay);
			}
			return relays;
		}

		return Array.from(this.relays.values());
	}

	requestRelay(url: string | URL, connect = true) {
		url = validateRelayURL(url);

		const key = url.toString();
		if (!this.relays.has(key)) {
			const r = new Relay(key);
			r._onauth = (challenge) => this.onRelayChallenge.next([r, challenge]);
			r.onnotice = (notice) => this.handleRelayNotice(r, notice);

			this.relays.set(key, r);
			this.onRelayCreated.next(r);
		}

		const relay = this.relays.get(key) as Relay;
		if (connect && !relay.connected) this.requestConnect(relay);
		return relay;
	}

	async waitForOpen(relayOrUrl: string | URL | Relay, quite = true) {
		let relay = this.getRelay(relayOrUrl);
		if (!relay) return Promise.reject('Missing relay');

		if (relay.connected) return true;

		try {
			// if the relay is connecting, wait. otherwise request a connection
			// @ts-expect-error
			(await relay.connectionPromise) || this.requestConnect(relay, quite);
			return true;
		} catch (err) {
			if (quite) return false;
			else throw err;
		}
	}

	async requestConnect(relayOrUrl: string | URL | Relay, quite = true) {
		let relay = this.getRelay(relayOrUrl);
		if (!relay) return;

		if (!relay.connected) {
			this.connecting.get(relay).next(true);
			try {
				await relay.connect();
				this.connecting.get(relay).next(false);
			} catch (e) {
				e = e || new Error('Unknown error');
				if (e instanceof Error) {
					this.log(`Failed to connect to ${relay.url}`, e.message);
					this.connectionErrors.get(relay).push(e);
				}
				this.connecting.get(relay).next(false);
				if (!quite) throw e;
			}
		}
	}

	handleRelayNotice(relay: Relay, message: string) {
		const subject = this.notices.get(relay);
		subject.next([...subject.value, { message, date: dayjs().unix() }]);
	}
}
