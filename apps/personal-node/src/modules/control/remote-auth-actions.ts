import { WebSocket } from 'ws';
import { verifyEvent } from 'nostr-tools';
import { RemoteAuthMessage, RemoteAuthResponse } from '@satellite-earth/core/types/control-api/remote-auth.js';

import type App from '../../app/index.js';
import { type ControlMessageHandler } from './control-api.js';

/** handles ['CONTROL', 'REMOTE-AUTH', ...] messages */
export default class RemoteAuthActions implements ControlMessageHandler {
	app: App;
	name = 'REMOTE-AUTH';

	private subscribed = new Set<WebSocket | NodeJS.Process>();

	constructor(app: App) {
		this.app = app;

		// when config changes send it to the subscribed sockets
		this.app.pool.emitter.on('challenge', (relay, challenge) => {
			for (const sock of this.subscribed) {
				this.send(sock, [
					'CONTROL',
					'REMOTE-AUTH',
					'STATUS',
					relay.url,
					challenge,
					!!this.app.pool.authenticated.get(relay.url),
				]);
			}
		});
	}

	sendAllStatuses(sock: WebSocket | NodeJS.Process) {
		for (const [url, relay] of this.app.pool) {
			const challenge = this.app.pool.challenges.get(url);
			const authenticated = this.app.pool.isAuthenticated(url);

			if (challenge) {
				this.send(sock, ['CONTROL', 'REMOTE-AUTH', 'STATUS', url, challenge, authenticated]);
			}
		}
	}

	async handleMessage(sock: WebSocket | NodeJS.Process, message: RemoteAuthMessage) {
		const method = message[2];
		switch (method) {
			case 'SUBSCRIBE':
				this.subscribed.add(sock);
				sock.once('close', () => this.subscribed.delete(sock));
				this.sendAllStatuses(sock);
				return true;
			case 'UNSUBSCRIBE':
				this.subscribed.delete(sock);
				return true;
			case 'AUTHENTICATE':
				const event = message[3];
				if (verifyEvent(event)) {
					const relay = event.tags.find((t) => (t[0] = 'relay'))?.[1];
					if (relay) await this.app.pool.authenticate(relay, event);
				}
			default:
				return false;
		}
	}

	send(sock: WebSocket | NodeJS.Process, response: RemoteAuthResponse) {
		sock.send?.(JSON.stringify(response));
	}
}
