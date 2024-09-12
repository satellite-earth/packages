import { WebSocket } from 'ws';
import {
	DecryptionCacheMessage,
	DecryptionCacheResponse,
} from '@satellite-earth/core/types/control-api/decryption-cache.js';

import type App from '../../app/index.js';
import { type ControlMessageHandler } from './control-api.js';

/** handles ['CONTROL', 'DECRYPTION-CACHE', ...] messages */
export default class DecryptionCacheActions implements ControlMessageHandler {
	app: App;
	name = 'DECRYPTION-CACHE';

	constructor(app: App) {
		this.app = app;
	}

	handleMessage(sock: WebSocket | NodeJS.Process, message: DecryptionCacheMessage) {
		const method = message[2];
		switch (method) {
			case 'ADD-CONTENT':
				this.app.decryptionCache.addEventContent(message[3], message[4]);
				return true;

			case 'CLEAR-PUBKEY':
				this.app.decryptionCache.clearPubkey(message[3]);
				return true;

			case 'CLEAR':
				this.app.decryptionCache.clearAll();
				return true;

			case 'REQUEST':
				this.app.decryptionCache.getEventsContent(message[3]).then((contents) => {
					for (const { event, content } of contents)
						this.send(sock, ['CONTROL', 'DECRYPTION-CACHE', 'CONTENT', event, content]);
					this.send(sock, ['CONTROL', 'DECRYPTION-CACHE', 'END']);
				});
				return true;

			default:
				return false;
		}
	}

	send(sock: WebSocket | NodeJS.Process, response: DecryptionCacheResponse) {
		sock.send?.(JSON.stringify(response));
	}
}
