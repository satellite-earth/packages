import path from 'path';
import express, { type Express } from 'express';
import Database, { type Database as TDatabase } from 'better-sqlite3';
import { NostrRelay, SQLiteEventStore, terminateConnectionsInterval } from '@satellite-earth/core';
import { createServer } from 'http';
import { WebSocketServer } from 'ws';
import { SimplePool } from 'nostr-tools';
import { mkdirp } from 'mkdirp';
import { resolve as importMetaResolve } from 'import-meta-resolve';
import type HolesailServer from 'holesail-server';

import { DATA_PATH, ENABLE_HYPER_DHT, PORT, PUBLIC_URL, REDIRECT_APP_URL, SECRET_KEY } from '../env.js';
import Signer from '../modules/signer.js';
import { CommunityConfig } from '../modules/community-config.js';
import { DeletionManager } from '../modules/deletion-manager.js';
import { ChannelManager } from '../modules/channel-manager.js';
import { AdminCommands } from '../modules/admin-command.js';
import { logger } from '../logger.js';

// create the database
await mkdirp(DATA_PATH);
const database: TDatabase = new Database(path.join(DATA_PATH, 'sqlite.db'));
database.pragma('journal_mode = WAL');

if (!SECRET_KEY) throw new Error('Missing SECRET_KEY');
const signer = new Signer(SECRET_KEY);

const eventStore = new SQLiteEventStore(database);
await eventStore.setup();

const server = createServer();
const wss = new WebSocketServer({ server });

// create express app
const expressApp: Express = express();
server.on('request', expressApp);

if (REDIRECT_APP_URL) {
	// redirect to other web ui
	const url = new URL('/', REDIRECT_APP_URL);
	url.searchParams.set('community', signer.getPublicKey());

	// TODO: set relay wss:// url so app can connect

	expressApp.get('*', (req, res) => res.redirect(url.toString()));
} else {
	// serve the web ui
	const communityDir = path.dirname(
		importMetaResolve('@satellite-earth/web-ui', import.meta.url).replace('file://', ''),
	);
	expressApp.use(express.static(communityDir));
	expressApp.get('*', (req, res) => {
		res.sendFile(path.resolve(communityDir, 'index.html'));
	});
}

// terminate connections if they become inactive
terminateConnectionsInterval(wss, 30000);

// setup relay
const relay = new NostrRelay(eventStore);
relay.attachToServer(wss);

// outbound relay pool
const relayPool = new SimplePool();

// community metadata
const communityConfig = new CommunityConfig(eventStore, signer, relayPool);

// deletion manager
const deletionManager = new DeletionManager(eventStore, signer);

// channel manager
const channelManager = new ChannelManager(eventStore, signer, deletionManager);
channelManager.setup();

// ensure the general channel is created
// NOTE: the general channel should be prefixed by the community pubkey. also this should probably be moved somewhere else
if (!channelManager.getChannel('general')) {
	const prefix = signer.getPublicKey().slice(0, 8) + '-';
	channelManager.createChannel(prefix + 'general', { name: 'General', about: 'The main text channel' });
}

// setup admin commands on the relay
const commands = new AdminCommands(relay, channelManager);

// start the wss and http server
let holesail: HolesailServer;
server.listen(PORT, async () => {
	logger('Started server on port', PORT);

	const addresses: string[][] = [];

	if (PUBLIC_URL) addresses.push(['r', PUBLIC_URL]);

	if (ENABLE_HYPER_DHT) {
		const { default: HolesailServer } = await import('holesail-server');

		holesail = new HolesailServer();
		await holesail.serve({ port: PORT, address: '127.0.0.1', buffSeed: SECRET_KEY });

		const hyperAddress = holesail.getPublicKey();
		addresses.push(['r', hyperAddress, 'hyper']);

		logger('Started server on', hyperAddress);
	}

	await communityConfig.publish(['wss://nostrue.com'], addresses);

	logger('Published community definition event for', signer.getPublicKey());
});

async function shutdown() {
	relay.stop();
	wss.close();
	server.close();
	if (holesail) holesail.destroy();
}

const app = {
	signer,
	server,
	wss,
	express: expressApp,
	relay,
	commands,
	communityConfig,
	deletionManager,
	channelManager,
	shutdown,
};

export type AppType = typeof app;

export default app;
