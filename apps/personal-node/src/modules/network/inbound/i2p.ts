import type { AddressInfo } from 'net';
import type { I2pSamStream } from '@diva.exchange/i2p-sam';

import App from '../../../app/index.js';
import { I2P_SAM_ADDRESS } from '../../../env.js';
import { logger } from '../../../logger.js';
import { InboundInterface } from '../interfaces.js';

export default class I2PInbound implements InboundInterface {
	app: App;
	log = logger.extend('Network:Inbound:I2P');

	available = !!I2P_SAM_ADDRESS;
	running = false;
	address?: string;
	error?: Error;

	private forward?: I2pSamStream;

	constructor(app: App) {
		this.app = app;
	}

	async start(address: AddressInfo) {
		try {
			if (this.running) return;
			this.running = true;

			const [host, port] = I2P_SAM_ADDRESS?.split(':') ?? [];
			if (!host || !port) throw new Error(`Malformed proxy address ${I2P_SAM_ADDRESS}`);

			this.log('Importing I2P SAM package');
			const { createForward } = await import('@diva.exchange/i2p-sam');

			// try to get the last key pair that was used
			const privateKey = this.app.secrets.get('i2pPrivateKey');
			const publicKey = this.app.secrets.get('i2pPublicKey');

			this.log('Creating forwarding stream');
			this.forward = await createForward({
				sam: {
					host: host,
					portTCP: parseInt(port),
					privateKey,
					publicKey,
				},
				forward: {
					host: address.address,
					port: address.port,
				},
			});

			this.address = 'http://' + this.forward.getB32Address();

			this.log(`Listening on ${this.address}`);

			// save the key pair for later
			this.app.secrets.set('i2pPrivateKey', this.forward.getPrivateKey());
			this.app.secrets.set('i2pPublicKey', this.forward.getPublicKey());
		} catch (error) {
			this.running = false;
			if (error instanceof Error) this.error = error;
		}
	}

	async stop() {
		if (!this.running) return;
		this.running = false;

		if (this.forward) {
			this.log('Closing forwarding stream');
			this.forward.close();
			this.forward = undefined;
		}
	}
}
