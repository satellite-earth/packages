import { logger } from '../../../logger.js';
import { OutboundInterface } from '../interfaces.js';
import { I2P_PROXY, I2P_PROXY_TYPE } from '../../../env.js';
import { testTCPConnection } from '../../../helpers/network.js';

export default class I2POutbound implements OutboundInterface {
	log = logger.extend('Network:Outbound:I2P');

	running = false;
	error?: Error;
	readonly type = I2P_PROXY_TYPE;
	readonly address = I2P_PROXY;
	readonly available = !!I2P_PROXY;

	async start() {
		try {
			if (this.running) return;
			this.running = true;

			this.log(`Connecting to ${I2P_PROXY}`);
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
