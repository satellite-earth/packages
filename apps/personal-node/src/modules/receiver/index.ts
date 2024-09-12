import EventEmitter from 'events';
import { NostrEvent, SimplePool, Filter } from 'nostr-tools';
import SuperMap from '@satellite-earth/core/helpers/super-map.js';
import { AbstractRelay, Subscription, SubscriptionParams } from 'nostr-tools/abstract-relay';
import { getPubkeysFromList } from '@satellite-earth/core/helpers/nostr/lists.js';
import { getInboxes, getOutboxes } from '@satellite-earth/core/helpers/nostr/mailboxes.js';
import { getRelaysFromContactList } from '@satellite-earth/core/helpers/nostr/contacts.js';

import { BOOTSTRAP_RELAYS } from '../../env.js';
import { logger } from '../../logger.js';
import App from '../../app/index.js';

/** creates a new subscription and waits for it to get an event or close */
function asyncSubscription(relay: AbstractRelay, filters: Filter[], opts: SubscriptionParams) {
	let resolved = false;

	return new Promise<Subscription>((res, rej) => {
		const sub = relay.subscribe(filters, {
			onevent: (event) => {
				if (!resolved) res(sub);
				opts.onevent?.(event);
			},
			oneose: () => {
				if (!resolved) res(sub);
				opts.oneose?.();
			},
			onclose: (reason) => {
				if (!resolved) rej(new Error(reason));
				opts.onclose?.(reason);
			},
		});
	});
}

type EventMap = {
	started: [Receiver];
	stopped: [Receiver];
	status: [string];
	rebuild: [];
	subscribed: [string, string[]];
	closed: [string, string[]];
	error: [Error];
	event: [NostrEvent];
};

type ReceiverStatus = 'running' | 'starting' | 'errored' | 'stopped';

export default class Receiver extends EventEmitter<EventMap> {
	log = logger.extend('Receiver');

	_status: ReceiverStatus = 'stopped';
	get status() {
		return this._status;
	}
	set status(v: ReceiverStatus) {
		this._status = v;
		this.emit('status', v);
	}

	starting = true;
	startupError?: Error;

	app: App;
	pool: SimplePool;

	subscriptions = new Map<string, Subscription>();

	constructor(app: App, pool?: SimplePool) {
		super();
		this.app = app;
		this.pool = pool || app.pool;
	}

	// pubkey -> relays
	private pubkeyRelays = new Map<string, Set<string>>();
	// relay url -> pubkeys
	private relayPubkeys = new SuperMap<string, Set<string>>(() => new Set());

	// the current request map in the format of relay -> pubkeys
	map = new SuperMap<string, Set<string>>(() => new Set());

	async fetchData() {
		const owner = this.app.config.data.owner;
		if (!owner) throw new Error('Missing owner');

		const ownerMailboxes = await this.app.addressBook.loadMailboxes(owner);
		const ownerInboxes = getInboxes(ownerMailboxes);
		const ownerOutboxes = getOutboxes(ownerMailboxes);

		this.log('Searching for owner kind:3 contacts');
		const contacts = await this.app.contactBook.loadContacts(owner);
		if (!contacts) throw new Error('Cant find contacts');

		this.pubkeyRelays.clear();
		this.relayPubkeys.clear();

		// add the owners details
		this.pubkeyRelays.set(owner, new Set(ownerOutboxes));
		for (const url of ownerOutboxes) this.relayPubkeys.get(url).add(owner);

		const people = getPubkeysFromList(contacts);

		this.log(`Found ${people.length} contacts`);

		let usersWithMailboxes = 0;
		let usersWithContactRelays = 0;
		let usersWithFallbackRelays = 0;

		// fetch all addresses in parallel
		await Promise.all(
			people.map(async (person) => {
				const mailboxes = await this.app.addressBook.loadMailboxes(person.pubkey, ownerInboxes ?? BOOTSTRAP_RELAYS);

				let relays = getOutboxes(mailboxes);

				// if the user does not have any mailboxes try to get the relays stored in the contact list
				if (relays.length === 0) {
					this.log(`Failed to find mailboxes for ${person.pubkey}`);
					const contacts = await this.app.contactBook.loadContacts(person.pubkey, ownerInboxes ?? BOOTSTRAP_RELAYS);

					if (contacts && contacts.content.startsWith('{')) {
						const parsed = getRelaysFromContactList(contacts);
						if (parsed) {
							relays = parsed.filter((r) => r.write).map((r) => r.url);
							usersWithContactRelays++;
						} else {
							relays = BOOTSTRAP_RELAYS;
							usersWithFallbackRelays++;
						}
					} else {
						relays = BOOTSTRAP_RELAYS;
						usersWithFallbackRelays++;
					}
				} else usersWithMailboxes++;

				// add pubkey details
				this.pubkeyRelays.set(person.pubkey, new Set(relays));
				for (const url of relays) this.relayPubkeys.get(url).add(person.pubkey);
			}),
		);

		this.log(
			`Found ${usersWithMailboxes} users with mailboxes, ${usersWithContactRelays} user with relays in contact list, and ${usersWithFallbackRelays} using fallback relays`,
		);
	}

	buildMap() {
		this.map.clear();

		// sort pubkey relays by popularity
		for (const [pubkey, relays] of this.pubkeyRelays) {
			const sorted = Array.from(relays).sort((a, b) => this.relayPubkeys.get(b).size - this.relayPubkeys.get(a).size);

			// add the pubkey to their top two relays
			for (const url of sorted.slice(0, 2)) this.map.get(url).add(pubkey);
		}

		this.emit('rebuild');

		return this.map;
	}

	private handleEvent(event: NostrEvent) {
		this.emit('event', event);
	}

	async updateRelaySubscription(url: string) {
		const pubkeys = this.map.get(url);
		if (pubkeys.size === 0) return;

		const subscription = this.subscriptions.get(url);
		if (!subscription || subscription.closed) {
			const relay = await this.app.pool.ensureRelay(url);

			const sub = relay.subscribe([{ authors: Array.from(pubkeys) }], {
				onevent: this.handleEvent.bind(this),
				onclose: () => {
					this.emit('closed', url, Array.from(pubkeys));
					// wait 30 seconds then try to reconnect
					setTimeout(() => {
						this.updateRelaySubscription(url);
					}, 30_000);
				},
			});

			this.emit('subscribed', url, Array.from(pubkeys));
			this.subscriptions.set(url, sub);
			this.log(`Subscribed to ${url} for ${pubkeys.size} pubkeys`);
		} else {
			const hasOld = subscription.filters[0].authors?.some((p) => !pubkeys.has(p));
			const hasNew = Array.from(pubkeys).some((p) => !subscription.filters[0].authors?.includes(p));

			if (hasNew || hasOld) {
				// reset the subscription
				subscription.eosed = false;
				subscription.filters = [{ authors: Array.from(pubkeys) }];
				subscription.fire();
				this.log(`Subscribed to ${url} with ${pubkeys.size} pubkeys`);
			}
		}
	}

	ensureSubscriptions() {
		const promises: Promise<void>[] = [];

		for (const [url, pubkeys] of this.map) {
			const p = this.updateRelaySubscription(url).catch((error) => {
				// failed to connect to relay
				// this needs to be remembered and the subscription map should be rebuilt accordingly
			});

			promises.push(p);
		}

		return Promise.all(promises);
	}

	async start() {
		if (this.status === 'running' || this.status === 'starting') return;

		try {
			this.log('Starting');
			this.startupError = undefined;
			this.status = 'starting';

			await this.fetchData();
			this.buildMap();
			await this.ensureSubscriptions();

			this.status = 'running';
			this.emit('started', this);
		} catch (error) {
			this.status = 'errored';
			if (error instanceof Error) {
				this.startupError = error;
				this.log(`Failed to start receiver`, error.message);
				this.emit('error', error);
			}
		}
	}

	/** stop receiving events and disconnect from all relays */
	stop() {
		if (this.status !== 'stopped') return;

		this.status = 'stopped';

		for (const [relay, sub] of this.subscriptions) sub.close();
		this.subscriptions.clear();

		this.log('Stopped');
		this.emit('stopped', this);
	}

	destroy() {
		this.stop();
		this.removeAllListeners();
	}
}
