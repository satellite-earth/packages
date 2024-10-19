import { RawData, WebSocket } from 'ws';
import { IncomingMessage } from 'http';
import { logger } from '../../logger.js';
import OutboundProxyWebSocket from '../network/outbound/websocket.js';
import { isHexKey } from 'applesauce-core/helpers';
import App from '../../app/index.js';

export default class Switchboard {
	private app: App;
	private log = logger.extend('Switchboard');

	constructor(app: App) {
		this.app = app;
	}

	public handleConnection(downstream: WebSocket, req: IncomingMessage) {
		let upstream: WebSocket | undefined;

		const handleMessage = async (message: RawData) => {
			try {
				// Parse JSON from the raw buffer
				const data = JSON.parse(typeof message === 'string' ? message : message.toString('utf-8'));

				if (!Array.isArray(data)) throw new Error('Message is not an array');

				if (data[0] === 'PROXY' && data[1]) {
					let addresses: string[];
					if (isHexKey(data[1])) {
						addresses = await this.app.gossip.lookup(data[1]);
					} else addresses = [data[1]];

					if (addresses.length === 0) {
						downstream.send(JSON.stringify(['PROXY', 'ERROR', 'Lookup failed']));
						return;
					}

					this.app.relay.disconnectSocket(downstream);
					downstream.send(JSON.stringify(['PROXY', 'CONNECTING']));

					let error: Error | undefined = undefined;
					for (const address of addresses) {
						try {
							upstream = new OutboundProxyWebSocket(address);

							// wait for connection
							await new Promise<void>((res, rej) => {
								upstream?.once('open', () => res());
								upstream?.once('error', (error) => rej(error));
							});

							this.log(`Proxy connection to ${address}`);

							// clear last error
							error = undefined;

							// Forward from client to target relay
							downstream.on('message', (message, isBinary) => {
								upstream?.send(message, { binary: isBinary });
							});

							// Forward back from target relay to client
							upstream.on('message', (message, isBinary) => {
								downstream.send(message, { binary: isBinary });
							});

							// connect the close events
							upstream.on('close', () => downstream.close());
							downstream.on('close', () => upstream?.close());

							// tell downstream its connected
							downstream.send(JSON.stringify(['PROXY', 'CONNECTED']));

							// Step away from the connection
							downstream.off('message', handleMessage);
						} catch (err) {
							upstream = undefined;
							if (err instanceof Error) error = err;
						}
					}

					// send the error back if we failed to connect to any address
					if (error) downstream.send(JSON.stringify(['PROXY', 'ERROR', error.message]));
				}
			} catch (err) {
				this.log('Failed to handle message', err);
			}
		};
		downstream.on('message', handleMessage);

		this.app.relay.handleConnection(downstream, req);
	}
}
