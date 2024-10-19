import { SimpleSigner } from 'applesauce-signer/signers/simple-signer';
import { EventTemplate, SimplePool } from 'nostr-tools';
import dayjs from 'dayjs';

import { logger } from '../logger.js';
import { NostrRelay } from '@satellite-earth/core';
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

	running = false;
	// default every 10 minute
	interval = 10 * 60_000;
	broadcastRelays: string[] = [];

	constructor(network: InboundNetworkManager, signer: SimpleSigner, pool: SimplePool, relay: NostrRelay) {
		this.network = network;
		this.signer = signer;
		this.pool = pool;
		this.relay = relay;
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
}
