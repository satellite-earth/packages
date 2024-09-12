import Report from '../report.js';

export default class NetworkStatusReport extends Report<'NETWORK_STATUS'> {
	readonly type = 'NETWORK_STATUS';

	update() {
		const torIn = this.app.inboundNetwork.tor;
		const torOut = this.app.outboundNetwork.tor;
		const hyperIn = this.app.inboundNetwork.hyper;
		const hyperOut = this.app.outboundNetwork.hyper;
		const i2pIn = this.app.inboundNetwork.i2p;
		const i2pOut = this.app.outboundNetwork.i2p;

		this.send({
			tor: {
				inbound: {
					available: torIn.available,
					running: torIn.running,
					error: torIn.error?.message,
					address: torIn.address,
				},
				outbound: {
					available: torOut.available,
					running: torOut.running,
					error: torOut.error?.message,
				},
			},
			hyper: {
				inbound: {
					available: hyperIn.available,
					running: hyperIn.running,
					error: hyperIn.error?.message,
					address: hyperIn.address,
				},
				outbound: {
					available: hyperOut.available,
					running: hyperOut.running,
					error: hyperOut.error?.message,
				},
			},
			i2p: {
				inbound: {
					available: i2pIn.available,
					running: i2pIn.running,
					error: i2pIn.error?.message,
					address: i2pIn.address,
				},
				outbound: {
					available: i2pOut.available,
					running: i2pOut.running,
					error: i2pOut.error?.message,
				},
			},
		});
	}

	async setup() {
		const listener = this.update.bind(this);

		// NOTE: set and interval since there are not events to listen to yet
		const i = setInterval(listener, 1000);

		return () => clearInterval(i);
	}

	async execute(args: {}): Promise<void> {
		this.update();
	}
}
