import { type Database } from 'better-sqlite3';
import { WebSocket, WebSocketServer } from 'ws';
import { type IncomingMessage } from 'http';
import { randomBytes } from 'crypto';
import { NostrEvent, SimplePool } from 'nostr-tools';

import { HyperConnectionManager } from './hyper-connection-manager.js';
import { logger } from '../logger.js';
import { CommunityProxy } from './community-proxy.js';
import { IEventStore } from '@satellite-earth/core';

export class CommunityMultiplexer {
	log = logger.extend('community-multiplexer');
	db: Database;
	eventStore: IEventStore;
	pool: SimplePool;
	connectionManager: HyperConnectionManager;

	communities = new Map<string, CommunityProxy>();

	constructor(db: Database, eventStore: IEventStore) {
		this.db = db;
		this.eventStore = eventStore;
		this.pool = new SimplePool();

		this.connectionManager = new HyperConnectionManager(randomBytes(32).toString('hex'));

		this.syncCommunityDefinitions();
	}

	attachToServer(wss: WebSocketServer) {
		wss.on('connection', this.handleConnection.bind(this));
	}

	handleConnection(ws: WebSocket, req: IncomingMessage) {
		if (!req.url) return false;

		const url = new URL(req.url, `http://${req.headers.host}`);
		const pubkey = url.pathname.split('/')[1] as string | undefined;
		if (!pubkey || pubkey.length !== 64) return false;

		try {
			let community = this.communities.get(pubkey);
			if (!community) community = this.getCommunityProxy(pubkey);

			// connect the socket to the relay
			community.relay.handleConnection(ws, req);
			return true;
		} catch (error) {
			this.log('Failed handle ws connection to', pubkey);
			console.log(error);
			return false;
		}
	}

	syncCommunityDefinitions() {
		this.log('Syncing community definitions');
		const sub = this.pool.subscribeMany(['wss://nostrue.com'], [{ kinds: [12012] }], {
			onevent: (event) => this.eventStore.addEvent(event),
			oneose: () => sub.close(),
		});
	}

	getCommunityProxy(pubkey: string) {
		this.log('Looking for community definition', pubkey);
		let definition: NostrEvent | undefined = undefined;

		const local = this.eventStore.getEventsForFilters([{ kinds: [12012], authors: [pubkey] }]);
		if (local[0]) definition = local[0];

		if (!definition) throw new Error('Failed to find community definition');

		this.log('Creating community proxy', pubkey);
		const community = new CommunityProxy(this.db, definition, this.connectionManager);

		community.connect();
		this.communities.set(pubkey, community);

		return community;
	}

	stop() {
		for (const [pubkey, community] of this.communities) {
			community.stop();
		}
		this.communities.clear();
		this.connectionManager.stop();
	}
}
