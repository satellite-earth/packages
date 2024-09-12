import { WebSocket, WebSocketServer } from 'ws';
import { type IncomingMessage } from 'http';
import { ControlResponse } from '@satellite-earth/core/types/control-api/index.js';

import type App from '../../app/index.js';
import { logger } from '../../logger.js';

export type ControlMessage = ['CONTROL', string, string, ...any[]];
export interface ControlMessageHandler {
	app: App;
	name: string;
	handleConnection?(ws: WebSocket | NodeJS.Process): void;
	handleDisconnect?(socket: WebSocket): void;
	handleMessage(sock: WebSocket | NodeJS.Process, message: ControlMessage): boolean | Promise<boolean>;
}

/** handles web socket connections and 'CONTROL' messages */
export default class ControlApi {
	app: App;
	auth?: string;
	log = logger.extend('ControlApi');
	handlers = new Map<string, ControlMessageHandler>();

	authenticatedConnections = new Set<WebSocket | NodeJS.Process>();

	constructor(app: App, auth?: string) {
		this.app = app;
		this.auth = auth;
	}

	registerHandler(handler: ControlMessageHandler) {
		this.handlers.set(handler.name, handler);
	}
	unregisterHandler(handler: ControlMessageHandler) {
		this.handlers.delete(handler.name);
	}

	/** start listening for incoming ws connections */
	attachToServer(wss: WebSocketServer) {
		wss.on('connection', this.handleConnection.bind(this));
	}

	handleConnection(ws: WebSocket, req: IncomingMessage) {
		ws.on('message', (data, isBinary) => {
			this.handleRawMessage(ws, data as Buffer);
		});

		for (const [id, handler] of this.handlers) {
			handler.handleConnection?.(ws);
		}

		ws.once('close', () => this.handleDisconnect(ws));
	}
	handleDisconnect(ws: WebSocket) {
		this.authenticatedConnections.delete(ws);

		for (const [id, handler] of this.handlers) {
			handler.handleDisconnect?.(ws);
		}
	}

	attachToProcess(p: NodeJS.Process) {
		p.on('message', (message) => {
			if (
				Array.isArray(message) &&
				message[0] === 'CONTROL' &&
				typeof message[1] === 'string' &&
				typeof message[2] === 'string'
			) {
				this.handleMessage(p, message as ControlMessage);
			}
		});

		for (const [id, handler] of this.handlers) {
			handler.handleConnection?.(p);
		}
	}

	/** handle a ws message */
	async handleRawMessage(ws: WebSocket | NodeJS.Process, message: Buffer) {
		try {
			const data = JSON.parse(message.toString()) as string[];

			try {
				if (
					Array.isArray(data) &&
					data[0] === 'CONTROL' &&
					typeof data[1] === 'string' &&
					typeof data[2] === 'string'
				) {
					if (this.authenticatedConnections.has(ws) || data[1] === 'AUTH') {
						await this.handleMessage(ws, data as ControlMessage);
					}
				}
			} catch (err) {
				this.log('Failed to handle Control message', message);
				this.log(err);
			}
		} catch (error) {
			// failed to parse JSON, do nothing
		}
	}

	/** handle a ['CONTROL', ...] message */
	async handleMessage(sock: WebSocket | NodeJS.Process, message: ControlMessage) {
		// handle ['CONTROL', 'AUTH', <code>] messages
		if (message[1] === 'AUTH' && message[2] === 'CODE') {
			const code = message[3];
			if (code === this.auth) {
				this.authenticatedConnections.add(sock);
				this.send(sock, ['CONTROL', 'AUTH', 'SUCCESS']);
			} else {
				this.send(sock, ['CONTROL', 'AUTH', 'INVALID', 'Invalid Auth Code']);
			}
			return true;
		}

		const handler = this.handlers.get(message[1]);
		if (handler) {
			return await handler.handleMessage(sock, message);
		}

		this.log('Failed to handle Control message', message);
		return false;
	}

	send(sock: WebSocket | NodeJS.Process, response: ControlResponse) {
		sock.send?.(JSON.stringify(response));
	}
}
