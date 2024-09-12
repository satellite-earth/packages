import path from 'path';
import express, { type Express } from 'express';
import Database, { type Database as TDatabase } from 'better-sqlite3';
import { createServer } from 'http';
import { mkdirp } from 'mkdirp';
import bodyParser from 'body-parser';
import { randomBytes } from 'crypto';
import pfs from 'fs/promises';
import dayjs from 'dayjs';

import { COMMUNITY_DEFINITION_KIND } from '../const.js';
import { DATA_PATH, PORT, SECRET_KEY } from '../env.js';
import { closeHttpServer } from '../helpers/server.js';
import { logger } from '../logger.js';

import router from './api.js';
import Signer from '../modules/signer.js';
import { SQLiteEventStore } from '@satellite-earth/core';
import { SimplePool } from 'nostr-tools';

const server = createServer();

const expressApp: Express = express();
expressApp.use(bodyParser.urlencoded({ extended: false }));
expressApp.set('view engine', 'pug');
expressApp.use(router);

server.on('request', expressApp);

await mkdirp(DATA_PATH);
const database: TDatabase = new Database(path.join(DATA_PATH, 'sqlite.db'));
database.pragma('journal_mode = WAL');

const eventStore = new SQLiteEventStore(database);
await eventStore.setup();

// outbound relay connections
const relayPool = new SimplePool();

// start the wss and http server
server.listen(PORT, async () => {
	logger('Started setup server on port', PORT);
});

async function createCommunity(metadata: { name: string; about: string; owner: string }) {
	logger('Creating community', metadata.name);

	const secretKey = SECRET_KEY || randomBytes(32).toString('hex');

	if (!SECRET_KEY) {
		logger('Saving SECRET_KEY to .env');
		await pfs.appendFile('.env', `SECRET_KEY="${secretKey}"\n`);
	}

	const signer = new Signer(secretKey);

	const definitionEvent = await signer.signEvent({
		kind: COMMUNITY_DEFINITION_KIND,
		content: '',
		tags: [
			['name', metadata.name],
			['about', metadata.about],
			// ['image', metadata.image],
			// ['banner', metadata.banner],
			['owner', metadata.owner],
			// NIP-31 alt tag
			['alt', 'This event defines a satellite.earth community'],
		],
		created_at: dayjs().unix(),
	});

	logger('Created community definition event', definitionEvent);

	eventStore.addEvent(definitionEvent);

	logger('Publishing community definition to relays');
	await relayPool.publish(['wss://nostrue.com'], definitionEvent);

	shutdown().then(() => process.exit());
	// restart();
}

// async function restart() {
// 	logger('Restarting process');

// 	process.on('exit', () => {
// 		logger('Spawn new detached process');
// 		try {
// 			spawn(process.argv[0] ?? 'node', process.argv.slice(1), {
// 				cwd: process.cwd(),
// 				detached: true,
// 				stdio: 'inherit',
// 			});
// 		} catch (error) {
// 			logger('Failed to start new process, exiting');
// 		}
// 	});

// 	logger('Stopping process', process.pid);
// 	await shutdown();
// 	process.exit();
// }

async function shutdown() {
	database.close();
	await closeHttpServer(server);
}

const setupApp = {
	eventStore,
	express: expressApp,
	createCommunity,
	// restart,
	shutdown,
};

export type SetupAppType = typeof setupApp;

export default setupApp;
