import type { createProxy } from 'hyper-socks5-proxy';
import getPort from 'get-port';
import EventEmitter from 'events';

import { logger } from '../../../logger.js';
import { OutboundInterface } from '../interfaces.js';

type EventMap = {
	started: [];
	stopped: [];
};

export default class HyperOutbound extends EventEmitter<EventMap> implements OutboundInterface {
	log = logger.extend('Network:Outbound:Hyper');
	private port?: number;
	private proxy?: ReturnType<typeof createProxy>;

	running = false;
	error?: Error;
	readonly type = 'SOCKS5';
	address?: string;
	get available() {
		return true;
	}

	async start() {
		if (this.running) return;
		this.running = true;

		try {
			const { createProxy } = await import('hyper-socks5-proxy');
			const { getOrCreateNode } = await import('../../../sidecars/hyperdht.js');

			this.port = await getPort({ port: 1080 });
			this.proxy = createProxy({ node: await getOrCreateNode() });

			this.log('Starting SOCKS5 proxy');
			this.address = `127.0.0.1:${this.port}`;
			this.proxy.listen(this.port, '127.0.0.1');
			this.log(`Proxy listening on ${this.address}`);
			this.emit('started');
		} catch (error) {
			this.running = false;
			if (error instanceof Error) this.error = error;
		}
	}

	async stop() {
		if (!this.running) return;
		this.running = false;

		this.log('Stopping');
		await new Promise<void>((res) => this.proxy?.close(() => res()));
		this.proxy = undefined;
		this.emit('stopped');
	}
}
