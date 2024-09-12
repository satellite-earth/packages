import { WebSocket } from 'ws';
import { LogsMessage } from '@satellite-earth/core/types/control-api/logs.js';

import type App from '../../app/index.js';
import { type ControlMessageHandler } from './control-api.js';

/** handles ['CONTROL', 'DM', ...] messages */
export default class LogsActions implements ControlMessageHandler {
	app: App;
	name = 'LOGS';

	constructor(app: App) {
		this.app = app;
	}

	handleMessage(sock: WebSocket | NodeJS.Process, message: LogsMessage) {
		const method = message[2];
		switch (method) {
			case 'CLEAR':
				this.app.logStore.clearLogs(message[3] ? { service: message[3] } : undefined);
				return true;

			default:
				return false;
		}
	}
}
