import net from 'net';
import HyperDHT from 'hyperdht';
import { pipeline } from 'streamx';
import { logger } from '../logger.js';

const START_PORT = 25100;

export class HyperConnectionManager {
	log = logger.extend(`hyper-connection-manager`);
	sockets = new Map<string, net.Socket>();
	servers = new Map<string, net.Server>();
	node: HyperDHT;

	lastPort = START_PORT;

	constructor(privateKey: string) {
		this.node = new HyperDHT({
			keyPair: HyperDHT.keyPair(Buffer.from(privateKey, 'hex')),
		});
	}

	protected bind(pubkey: string) {
		return new Promise<net.Server>((res) => {
			const proxy = net.createServer({ allowHalfOpen: true }, (socket_) => {
				const socket = this.node.connect(Buffer.from(pubkey, 'hex'), {
					reusableSocket: true,
				});

				// @ts-expect-error
				socket.setKeepAlive(5000);

				socket.on('open', () => {
					// connect the sockets
					pipeline(socket_, socket, socket_);
				});
				socket.on('error', (error) => {
					this.log('Failed to connect to', pubkey);
					this.log(error);
				});
			});

			this.servers.set(pubkey, proxy);

			const port = this.lastPort++;
			proxy.listen(port, '127.0.0.1', () => {
				this.log('Bound hyper address', pubkey, 'to port:', port);
				res(proxy);
			});
		});
	}

	async getLocalAddress(pubkey: string) {
		let server = this.servers.get(pubkey);
		if (!server) server = await this.bind(pubkey);

		return server!.address() as net.AddressInfo;
	}

	stop() {
		for (const [pubkey, server] of this.servers) {
			server.close();
		}
		this.servers.clear();
	}
}
