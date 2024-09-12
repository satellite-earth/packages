import { WebSocket } from 'ws';
import { NotificationsMessage, NotificationsResponse } from '@satellite-earth/core/types/control-api/notifications.js';

import { ControlMessageHandler } from './control-api.js';
import type App from '../../app/index.js';
import { NostrEvent } from 'nostr-tools';

export default class NotificationActions implements ControlMessageHandler {
	app: App;
	name = 'NOTIFICATIONS';

	constructor(app: App) {
		this.app = app;
	}

	handleMessage(sock: WebSocket | NodeJS.Process, message: NotificationsMessage): boolean {
		const action = message[2];
		switch (action) {
			case 'GET-VAPID-KEY':
				this.send(sock, ['CONTROL', 'NOTIFICATIONS', 'VAPID-KEY', this.app.notifications.webPushKeys.publicKey]);
				return true;

			case 'REGISTER':
				this.app.notifications.addOrUpdateChannel(message[3]);
				return true;

			case 'NOTIFY':
				const event: NostrEvent | undefined = this.app.eventStore.getEventsForFilters([{ ids: [message[3]] }])?.[0];
				if (event) this.app.notifications.notify(event);
				return true;

			case 'UNREGISTER':
				this.app.notifications.removeChannel(message[3]);
				return true;

			default:
				return false;
		}
	}
	send(sock: WebSocket | NodeJS.Process, response: NotificationsResponse) {
		sock.send?.(JSON.stringify(response));
	}
}
