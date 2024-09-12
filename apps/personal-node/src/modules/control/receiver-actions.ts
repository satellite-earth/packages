import { WebSocket } from 'ws';
import { ReceiverMessage } from '@satellite-earth/core/types/control-api/receiver.js';

import type App from '../../app/index.js';
import { type ControlMessageHandler } from './control-api.js';

export default class ReceiverActions implements ControlMessageHandler {
	app: App;
	name = 'RECEIVER';

	constructor(app: App) {
		this.app = app;
	}
	handleMessage(sock: WebSocket | NodeJS.Process, message: ReceiverMessage): boolean {
		const action = message[2];
		switch (action) {
			case 'START':
				this.app.receiver.start();
				return true;

			case 'STOP':
				this.app.receiver.stop();
				return true;

			default:
				return false;
		}
	}
}
