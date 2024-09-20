import { WebSocket } from 'ws';
import { ScrapperMessage } from '@satellite-earth/core/types/control-api/scrapper.js';

import type App from '../../app/index.js';
import { type ControlMessageHandler } from './control-api.js';

export default class ScrapperActions implements ControlMessageHandler {
	app: App;
	name = 'SCRAPPER';

	constructor(app: App) {
		this.app = app;
	}
	handleMessage(sock: WebSocket | NodeJS.Process, message: ScrapperMessage): boolean {
		const action = message[2];
		switch (action) {
			case 'START':
				this.app.scrapper.start();
				return true;

			case 'STOP':
				this.app.scrapper.stop();
				return true;

			case 'ADD-PUBKEY':
				this.app.scrapper.addPubkey(message[3]);
				return true;

			case 'REMOVE-PUBKEY':
				this.app.scrapper.removePubkey(message[3]);
				return true;

			default:
				return false;
		}
	}
}
