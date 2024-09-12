import { logger } from '../../../logger.js';
import { OutboundInterface } from '../interfaces.js';
import { TOR_PROXY, TOR_PROXY_TYPE } from '../../../env.js';
import { testTCPConnection } from '../../../helpers/network.js';

export default class TorOutbound implements OutboundInterface {
	log = logger.extend('Network:Outbound:Tor');

	running = false;
	error?: Error;
	readonly type = TOR_PROXY_TYPE;
	readonly address = TOR_PROXY;
	readonly available = !!TOR_PROXY;

	async start() {
		try {
			if (this.running) return;
			this.running = true;

			this.log(`Connecting to ${TOR_PROXY}`);
			const [host, port] = this.address?.split(':') ?? [];
			if (!host || !port) throw new Error('Malformed proxy address');
			await testTCPConnection(host, parseInt(port), 3000);
		} catch (error) {
			this.running = false;
			if (error instanceof Error) this.error = error;
		}
	}

	async stop() {}
}
