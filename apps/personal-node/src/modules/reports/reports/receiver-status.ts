import Report from '../report.js';

export default class ReceiverStatusReport extends Report<'RECEIVER_STATUS'> {
	readonly type = 'RECEIVER_STATUS';

	update() {
		this.send({
			status: this.app.receiver.status,
			startError: this.app.receiver.startupError?.message,
			subscriptions: Array.from(this.app.receiver.map).map(([relay, pubkeys]) => ({
				relay,
				pubkeys: Array.from(pubkeys),
				active: !!this.app.receiver.subscriptions.get(relay),
				closed: !!this.app.receiver.subscriptions.get(relay)?.closed,
			})),
		});
	}

	async setup() {
		const listener = this.update.bind(this);

		this.app.receiver.on('status', listener);
		this.app.receiver.on('subscribed', listener);
		this.app.receiver.on('closed', listener);
		this.app.receiver.on('error', listener);

		return () => {
			this.app.receiver.off('status', listener);
			this.app.receiver.off('subscribed', listener);
			this.app.receiver.off('closed', listener);
			this.app.receiver.off('error', listener);
		};
	}

	async execute(args: {}): Promise<void> {
		this.update();
	}
}
