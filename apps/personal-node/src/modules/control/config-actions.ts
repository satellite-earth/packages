import { WebSocket } from 'ws';
import { ConfigMessage, ConfigResponse } from '@satellite-earth/core/types/control-api/config.js';

import type App from '../../app/index.js';
import { type ControlMessageHandler } from './control-api.js';

/** handles ['CONTROL', 'CONFIG', ...] messages */
export default class ConfigActions implements ControlMessageHandler {
	app: App;
	name = 'CONFIG';

	private subscribed = new Set<WebSocket | NodeJS.Process>();

	constructor(app: App) {
		this.app = app;

		// when config changes send it to the subscribed sockets
		this.app.config.on('changed', (config) => {
			for (const sock of this.subscribed) {
				this.send(sock, ['CONTROL', 'CONFIG', 'CHANGED', config]);
			}
		});
	}

	handleMessage(sock: WebSocket | NodeJS.Process, message: ConfigMessage) {
		const method = message[2];
		switch (method) {
			case 'SUBSCRIBE':
				this.subscribed.add(sock);
				sock.once('close', () => this.subscribed.delete(sock));
				this.send(sock, ['CONTROL', 'CONFIG', 'CHANGED', this.app.config.data]);
				return true;

			case 'SET':
				const field = message[3];
				const value = message[4];

				this.app.config.setField(field, value);
				return true;

			default:
				return false;
		}
	}

	send(sock: WebSocket | NodeJS.Process, response: ConfigResponse) {
		sock.send?.(JSON.stringify(response));
	}
}
