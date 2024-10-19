import EventEmitter from 'events';
import crypto, { randomUUID } from 'crypto';
import { IncomingMessage } from 'http';
import { type WebSocket, RawData } from 'ws';
import { Filter, NostrEvent, verifyEvent, matchFilters } from 'nostr-tools';

import { IEventStore } from '../sqlite-event-store/interface.js';
import { logger } from '../logger.js';

export type IncomingReqMessage = ['REQ', string, ...Filter[]];
export type IncomingCountMessage = ['COUNT', string, ...Filter[]];
export type IncomingEventMessage = ['EVENT', NostrEvent];
export type IncomingAuthMessage = ['AUTH', NostrEvent];
export type IncomingCloseMessage = ['CLOSE', string];

export type Subscription = {
	type: 'REQ' | 'COUNT';
	ws: WebSocket;
	id: string;
	filters: Filter[];
};

export type HandlerNext = () => Promise<void>;

export type HandlerContext = { event: NostrEvent; socket: WebSocket; relay: NostrRelay };
export type EventHandler = (
	ctx: HandlerContext,
	next: HandlerNext,
) => boolean | undefined | string | void | Promise<string | boolean | undefined | void>;

export type SubscriptionFilterContext = { id: string; filters: Filter[]; socket: WebSocket; relay: NostrRelay };
export type SubscriptionFilter = (
	ctx: SubscriptionFilterContext,
	next: HandlerNext,
) => boolean | undefined | void | Promise<boolean | undefined | void>;

type EventMap = {
	'event:received': [NostrEvent, WebSocket];
	'event:inserted': [NostrEvent, WebSocket];
	'event:rejected': [NostrEvent, WebSocket];
	'subscription:created': [Subscription, WebSocket];
	'subscription:updated': [Subscription, WebSocket];
	'subscription:closed': [Subscription, WebSocket];
	'socket:connect': [WebSocket];
	'socket:disconnect': [WebSocket];
	'socket:auth': [WebSocket, NostrEvent];
};

export class NostrRelay extends EventEmitter<EventMap> {
	static SUPPORTED_NIPS = [1, 4, 11, 45, 50, 70, 119];

	log = logger.extend('relay');
	eventStore: IEventStore;

	connectionId = new WeakMap<WebSocket, string>();

	// A map of subscriptions
	subscriptions: Subscription[] = [];

	// Create a map of connections
	// in the form <connid> : <ws>
	connections: Record<string, WebSocket> = {};

	publicURL?: string;
	requireRelayInAuth = true;
	sendChallenge = false;
	auth = new Map<WebSocket, { challenge: string; response?: NostrEvent }>();
	checkAuth?: (ws: WebSocket, auth: NostrEvent) => boolean | string;

	checkReadEvent?: (ws: WebSocket, event: NostrEvent, auth?: NostrEvent) => boolean;

	constructor(eventStore: IEventStore) {
		super();

		this.eventStore = eventStore;

		// listen for new events inserted into the store
		this.eventStore.on('event:inserted', (event) => {
			// make sure it wasn't the last event we inserted
			if (event.id !== this.lastInserted) this.sendEventToSubscriptions(event);
		});
	}

	async handleMessage(message: Buffer | string, ws: WebSocket) {
		let data;

		try {
			// TODO enforce max size

			// Parse JSON from the raw buffer
			data = JSON.parse(typeof message === 'string' ? message : message.toString('utf-8'));

			if (!Array.isArray(data)) throw new Error('Message is not an array');

			// Pass the data to appropriate handler
			switch (data[0]) {
				case 'REQ':
				case 'COUNT':
					await this.handleSubscriptionMessage(data as IncomingReqMessage | IncomingCountMessage, ws);
					break;
				case 'EVENT':
					await this.handleEventMessage(data as IncomingEventMessage, ws);
					break;
				case 'AUTH':
					await this.handleAuthMessage(data as IncomingAuthMessage, ws);
					break;
				case 'CLOSE':
					await this.handleCloseMessage(data as IncomingCloseMessage, ws);
					break;
			}
		} catch (err) {
			this.log('Failed to handle message', message.toString('utf-8'), err);
		}

		return data;
	}

	private socketCleanup = new Map<WebSocket, () => void>();
	handleConnection(ws: WebSocket, req: IncomingMessage) {
		let ip;

		// Record the IP address of the client
		if (typeof req.headers['x-forwarded-for'] === 'string') {
			ip = req.headers['x-forwarded-for'].split(',')[0].trim();
		} else {
			ip = req.socket.remoteAddress;
		}

		// listen for messages
		const messageListener = (data: RawData, isBinary: boolean) => {
			if (data instanceof Buffer) this.handleMessage(data, ws);
		};
		ws.on('message', messageListener);

		const closeListener = () => this.handleDisconnect(ws);
		ws.on('close', closeListener);

		if (this.sendChallenge) {
			const challenge = randomUUID();
			this.auth.set(ws, { challenge });
			ws.send(JSON.stringify(['AUTH', challenge]));
		}

		this.emit('socket:connect', ws);

		// Generate a unique ID for ws connection
		const id = crypto.randomUUID();

		this.connectionId.set(ws, id);
		this.connections[id] = ws;

		this.socketCleanup.set(ws, () => {
			delete this.connections[id];
			ws.off('message', messageListener);
			ws.off('close', closeListener);
			this.connectionId.delete(ws);
			this.auth.delete(ws);
			this.emit('socket:disconnect', ws);
		});
	}

	disconnectSocket(ws: WebSocket) {
		this.socketCleanup.get(ws)?.();
	}

	handleDisconnect(ws: WebSocket) {
		const id = this.connectionId.get(ws);
		if (!id) return;

		const openSubscriptions = this.subscriptions.filter((sub) => sub.ws === ws);

		// remove all subscriptions
		this.subscriptions = this.subscriptions.filter((sub) => sub.ws !== ws);

		for (const sub of openSubscriptions) {
			this.emit('subscription:closed', sub, ws);
		}

		this.connectionId.delete(ws);
		delete this.connections[id];

		this.emit('socket:disconnect', ws);
	}

	sendEventToSubscriptions(event: NostrEvent) {
		for (const sub of this.subscriptions) {
			if (sub.type === 'REQ' && !sub.filters.some((f) => f.search) && matchFilters(sub.filters, event)) {
				sub.ws.send(JSON.stringify(['EVENT', sub.id, event]));
			}
		}
	}

	/** Used to avoid infinite loop */
	private lastInserted: string = '';

	eventHandlers: EventHandler[] = [];
	private async callEventHandler(ctx: HandlerContext, index = 0): Promise<string | boolean | undefined | void> {
		const handler = this.eventHandlers[index];
		if (!handler) return;

		return await handler(ctx, async () => {
			await this.callEventHandler(ctx, index + 1);
		});
	}

	registerEventHandler(handler: EventHandler) {
		this.eventHandlers.push(handler);

		return () => this.unregisterEventHandler(handler);
	}
	unregisterEventHandler(handler: EventHandler) {
		const idx = this.eventHandlers.indexOf(handler);
		if (idx !== -1) this.eventHandlers.splice(idx, 1);
	}

	async handleEventMessage(data: IncomingEventMessage, ws: WebSocket) {
		// Get the event data
		const event = data[1] as NostrEvent;

		try {
			let inserted = false;

			// Verify the event's signature
			if (!verifyEvent(event)) throw new Error(`invalid: event failed to validate or verify`);

			// NIP-70 protected events
			const isProtected = event.tags.some((t) => t[0] === '-');
			if (isProtected && this.auth.get(ws)?.response?.pubkey !== event.pubkey) {
				throw new Error('auth-required: this event may only be published by its author');
			}

			const context: HandlerContext = { event, socket: ws, relay: this };
			let persist = (await this.callEventHandler(context)) ?? true;

			if (persist) {
				try {
					// Persist to database
					this.lastInserted = event.id;
					inserted = this.eventStore.addEvent(event);
				} catch (err) {
					console.log(err);
					throw new Error(`error: server error`);
				}

				this.emit('event:received', event, ws);
				if (inserted) {
					this.emit('event:inserted', event, ws);
					this.sendPublishOkMessage(ws, event, true, typeof persist === 'string' ? persist : '');

					this.sendEventToSubscriptions(event);
				} else {
					this.sendPublishOkMessage(ws, event, true, typeof persist === 'string' ? persist : 'Duplicate');
				}
			} else {
				// reject with generic message
				throw new Error('Rejected');
			}
		} catch (err) {
			if (err instanceof Error) {
				// error occurred, send back the OK message with false
				this.emit('event:rejected', event, ws);
				this.sendPublishOkMessage(ws, event, false, err.message);
			}
		}
	}

	// response helpers
	makeAuthRequiredReason(reason: string) {
		return 'auth-required: ' + reason;
	}
	sendPublishOkMessage(ws: WebSocket, event: NostrEvent, success: boolean, message?: string) {
		ws.send(JSON.stringify(message ? ['OK', event.id, success, message] : ['OK', event.id, success]));
	}
	sendPublishAuthRequired(ws: WebSocket, event: NostrEvent, message: string) {
		ws.send(JSON.stringify(['OK', event.id, false, this.makeAuthRequiredReason(message)]));
	}

	handleAuthMessage(data: IncomingAuthMessage, ws: WebSocket) {
		try {
			const event = data[1];
			if (!verifyEvent(event)) {
				return this.sendPublishOkMessage(ws, event, false, 'Invalid event');
			}

			const relay = event.tags.find((t) => t[0] === 'relay')?.[1];
			if (this.requireRelayInAuth) {
				if (!relay) {
					return this.sendPublishOkMessage(ws, event, false, 'Missing relay tag');
				}
				if (new URL(relay).toString() !== this.publicURL) {
					return this.sendPublishOkMessage(ws, event, false, 'Bad relay tag');
				}
			}

			// check challenge
			const challenge = this.auth.get(ws)?.challenge;
			const challengeResponse = event.tags.find((t) => t[0] === 'challenge')?.[1];

			if (!challengeResponse || !challenge) {
				return this.sendPublishOkMessage(ws, event, false, 'Missing challenge tag');
			}
			if (challengeResponse !== challenge) {
				return this.sendPublishOkMessage(ws, event, false, 'Bad challenge');
			}

			if (this.checkAuth) {
				const message = this.checkAuth(ws, event);
				if (typeof message === 'string') return this.sendPublishOkMessage(ws, event, false, message);
				else if (message === false) return this.sendPublishOkMessage(ws, event, false, 'Rejected auth');
			}

			this.auth.set(ws, { challenge, response: event });
			this.emit('socket:auth', ws, event);
			this.log('Authenticated', event.pubkey);
			this.sendPublishOkMessage(ws, event, true, 'Authenticated');
		} catch (e) {}
	}

	protected runSubscription(sub: Subscription) {
		const auth = this.getSocketAuth(sub.ws);

		switch (sub.type) {
			case 'REQ':
				const events = this.eventStore.getEventsForFilters(sub.filters);
				for (let event of events) {
					if (!this.checkReadEvent || this.checkReadEvent(sub.ws, event, auth)) {
						sub.ws.send(JSON.stringify(['EVENT', sub.id, event]));
					}
				}
				sub.ws.send(JSON.stringify(['EOSE', sub.id]));
				break;
			case 'COUNT':
				const count = this.eventStore.countEventsForFilters(sub.filters);
				sub.ws.send(JSON.stringify(['COUNT', sub.id, { count }]));
				break;
		}
	}

	subscriptionFilters: SubscriptionFilter[] = [];
	private async checkSubscriptionFilters(
		ctx: SubscriptionFilterContext,
		index = 0,
	): Promise<boolean | undefined | void> {
		const handler = this.subscriptionFilters[index];
		if (!handler) return;

		return await handler(ctx, async () => {
			await this.checkSubscriptionFilters(ctx, index + 1);
		});
	}
	registerSubscriptionFilter(filter: SubscriptionFilter) {
		this.subscriptionFilters.push(filter);

		return () => this.unregisterSubscriptionFilter(filter);
	}
	unregisterSubscriptionFilter(filter: SubscriptionFilter) {
		const idx = this.subscriptionFilters.indexOf(filter);
		if (idx !== -1) this.subscriptionFilters.splice(idx, 1);
	}

	async handleSubscriptionMessage(data: IncomingReqMessage | IncomingCountMessage, ws: WebSocket) {
		const [type, id, ...filters] = data;
		if (typeof id !== 'string' || filters.length === 0) return;

		try {
			const allow = (await this.checkSubscriptionFilters({ socket: ws, filters, id, relay: this })) ?? true;

			if (allow === false) {
				return this.closeSubscription(id, ws, 'Rejected');
			}

			let subscription = this.subscriptions.find((s) => s.id === id) || { type, id: id, ws, filters: [] };

			// override or set the filters
			subscription.filters = filters;

			// only save the subscription if its not a count
			if (type !== 'COUNT') {
				if (!this.subscriptions.includes(subscription)) {
					this.subscriptions.push(subscription);
					this.emit('subscription:created', subscription, ws);
				} else {
					this.emit('subscription:updated', subscription, ws);
				}
			}

			// Run the subscription
			await this.runSubscription(subscription);
		} catch (error) {
			if (typeof error === 'string') {
				this.closeSubscription(id, ws, error);
			} else if (error instanceof Error) {
				this.closeSubscription(id, ws, error.message);
			}
		}
	}

	closeSubscription(id: string, ws?: WebSocket, reason?: string) {
		const subscription = this.subscriptions.find((s) => s.id === id && (ws ? s.ws === ws : true));
		if (subscription) {
			this.subscriptions.splice(this.subscriptions.indexOf(subscription), 1);
			this.emit('subscription:closed', subscription, subscription.ws);
		}

		if (reason) (subscription?.ws || ws)?.send(JSON.stringify(['CLOSED', id, reason]));
	}
	handleCloseMessage(data: IncomingCloseMessage, ws: WebSocket) {
		if (typeof data[1] !== 'string') return;
		const id = data[1];

		this.closeSubscription(id, ws);
	}

	getSocketAuth(ws: WebSocket) {
		return this.auth.get(ws)?.response;
	}

	stop() {
		for (const ws of Object.values(this.connections)) {
			ws.close();
		}
		this.removeAllListeners();
	}
}
