import { WebSocket } from 'ws';
import { DirectMessageMessage } from '@satellite-earth/core/types/control-api/direct-messages.js';

import type App from '../../app/index.js';
import { type ControlMessageHandler } from './control-api.js';

/** handles ['CONTROL', 'DM', ...] messages */
export default class DirectMessageActions implements ControlMessageHandler {
	app: App;
	name = 'DM';

	constructor(app: App) {
		this.app = app;
	}

	handleMessage(sock: WebSocket | NodeJS.Process, message: DirectMessageMessage) {
		const method = message[2];
		switch (method) {
			case 'OPEN':
				this.app.directMessageManager.openConversation(message[3], message[4]);
				return true;

			case 'CLOSE':
				this.app.directMessageManager.closeConversation(message[3], message[4]);
				return true;

			default:
				return false;
		}
	}
}
