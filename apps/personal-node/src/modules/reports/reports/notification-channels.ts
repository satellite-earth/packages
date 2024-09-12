import { NotificationChannel } from '@satellite-earth/core/types/control-api/notifications.js';
import Report from '../report.js';

export default class NotificationChannelsReport extends Report<'NOTIFICATION_CHANNELS'> {
	readonly type = 'NOTIFICATION_CHANNELS';

	async setup() {
		const listener = this.send.bind(this);
		const removeListener = (channel: NotificationChannel) => {
			this.send(['removed', channel.id]);
		};

		this.app.notifications.on('addChannel', listener);
		this.app.notifications.on('updateChannel', listener);
		this.app.notifications.on('removeChannel', removeListener);

		return () => {
			this.app.notifications.off('addChannel', listener);
			this.app.notifications.off('updateChannel', listener);
			this.app.notifications.off('removeChannel', removeListener);
		};
	}

	async execute(args: {}): Promise<void> {
		for (const channel of this.app.notifications.channels) {
			this.send(channel);
		}
	}
}
