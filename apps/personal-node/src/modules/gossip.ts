import { SimpleSigner } from 'applesauce-signer/signers/simple-signer';
import { EventTemplate, SimplePool } from 'nostr-tools';
import { getTagValue } from 'applesauce-core/helpers';
import { IEventStore, NostrRelay } from '@satellite-earth/core';
import dayjs, { Dayjs } from 'dayjs';

import { logger } from '../logger.js';
import InboundNetworkManager from './network/inbound/index.js';

function buildGossipTemplate(self: string, address: string, network: string): EventTemplate {
	return {
		kind: 30166,
		content: '',
		tags: [
			['d', address],
			['n', network],
			['p', self],
			['T', 'PrivateInbox'],
			...NostrRelay.SUPPORTED_NIPS.map((nip) => ['N', String(nip)]),
		],
		created_at: dayjs().unix(),
	};
}

export default class Gossip {
	log = logger.extend('Gossip');
	network: InboundNetworkManager;
	signer: SimpleSigner;
	pool: SimplePool;
	relay: NostrRelay;
	eventStore: IEventStore;

	running = false;
	// default every 30 minutes
	interval = 30 * 60_000;
	broadcastRelays: string[] = [];

	constructor(
		network: InboundNetworkManager,
		signer: SimpleSigner,
		pool: SimplePool,
		relay: NostrRelay,
		eventStore: IEventStore,
	) {
		this.network = network;
		this.signer = signer;
		this.pool = pool;
		this.relay = relay;
		this.eventStore = eventStore;
	}

	async gossip() {
		const pubkey = await this.signer.getPublicKey();

		if (this.broadcastRelays.length === 0) return;

		if (this.network.hyper.available && this.network.hyper.address) {
			this.log('Publishing hyper gossip');
			await this.pool.publish(
				this.broadcastRelays,
				await this.signer.signEvent(buildGossipTemplate(pubkey, this.network.hyper.address, 'hyper')),
			);
		}

		if (this.network.tor.available && this.network.tor.address) {
			this.log('Publishing tor gossip');
			await this.pool.publish(
				this.broadcastRelays,
				await this.signer.signEvent(buildGossipTemplate(pubkey, this.network.tor.address, 'tor')),
			);
		}

		if (this.network.i2p.available && this.network.i2p.address) {
			this.log('Publishing i2p gossip');
			await this.pool.publish(
				this.broadcastRelays,
				await this.signer.signEvent(buildGossipTemplate(pubkey, this.network.i2p.address, 'i2p')),
			);
		}
	}

	private async update() {
		if (!this.running) return;
		await this.gossip();

		setTimeout(this.update.bind(this), this.interval);
	}

	start() {
		if (this.running) return;
		this.running = true;

		this.log(`Starting gossip on ${this.broadcastRelays.join(', ')}`);
		setTimeout(this.update.bind(this), 5000);
	}

	stop() {
		this.log('Stopping gossip');
		this.running = false;
	}

	private lookups = new Map<string, Dayjs>();
	async lookup(pubkey: string) {
		const last = this.lookups.get(pubkey);

		const filter = { authors: [pubkey], '#p': [pubkey], kinds: [30166] };

		// no cache or expired
		if (last === undefined || !last.isAfter(dayjs())) {
			await new Promise<void>((res) => {
				this.lookups.set(pubkey, dayjs().add(1, 'hour'));

				const sub = this.pool.subscribeMany(this.broadcastRelays, [filter], {
					onevent: (event) => this.eventStore.addEvent(event),
					oneose: () => {
						sub.close();
						res();
					},
				});
			});
		}

		const events = this.eventStore.getEventsForFilters([filter]);

		const addresses: string[] = [];
		for (const event of events) {
			const url = getTagValue(event, 'd');
			if (url) addresses.push(url);
		}
		return addresses;
	}
}
