#!/usr/bin/env node
import process from 'node:process';
import path from 'node:path';

import WebSocket from 'ws';
import express, { Request } from 'express';
import { mkdirp } from 'mkdirp';
import dayjs from 'dayjs';
import duration from 'dayjs/plugin/duration.js';
import localizedFormat from 'dayjs/plugin/localizedFormat.js';
import { useWebSocketImplementation } from 'nostr-tools/relay';
import { resolve as importMetaResolve } from 'import-meta-resolve';

import OutboundProxyWebSocket from './modules/network/outbound/websocket.js';
import App from './app/index.js';
import { PORT, DATA_PATH, AUTH, REDIRECT_APP_URL, PUBLIC_ADDRESS } from './env.js';
import { addListener, logger } from './logger.js';

// add durations plugin
dayjs.extend(duration);
dayjs.extend(localizedFormat);

// @ts-expect-error
global.WebSocket = OutboundProxyWebSocket;
useWebSocketImplementation(OutboundProxyWebSocket);

// create app
await mkdirp(DATA_PATH);
const app = new App(DATA_PATH);

// connect logger to app LogStore
addListener(({ namespace }, ...args) => {
	app.logStore.addEntry(namespace, Date.now(), args.join(' '));
});

function getPublicRelayAddressFromRequest(req: Request) {
	let url: URL;
	if (PUBLIC_ADDRESS) {
		url = new URL(PUBLIC_ADDRESS);
	} else {
		url = new URL('/', req.protocol + '://' + req.hostname);
		url.port = String(PORT);
	}
	url.protocol = req.protocol === 'https:' ? 'wss:' : 'ws:';

	return url;
}

// if the app isn't setup redirect to the setup view
app.express.get('/', (req, res, next) => {
	if (!app.config.data.owner) {
		logger('Redirecting to setup view');

		const url = new URL('/setup', REDIRECT_APP_URL || req.protocol + '://' + req.headers['host']);
		const relay = getPublicRelayAddressFromRequest(req);
		url.searchParams.set('relay', relay.toString());
		url.searchParams.set('auth', AUTH);
		res.redirect(url.toString());
	} else return next();
});

// serve the web ui or redirect to another hosted version
if (REDIRECT_APP_URL) {
	app.express.get('*', (req, res) => {
		const url = new URL('/connect', REDIRECT_APP_URL);
		const relay = getPublicRelayAddressFromRequest(req);
		url.searchParams.set('relay', relay.toString());

		res.redirect(url.toString());
	});
} else {
	const appDir = path.dirname(importMetaResolve('@satellite-earth/web-ui', import.meta.url).replace('file://', ''));
	app.express.use(express.static(appDir));
	app.express.get('*', (req, res) => {
		res.sendFile(path.resolve(appDir, 'index.html'));
	});
}

// log uncaught errors
process.on('unhandledRejection', (reason, promise) => {
	if (reason instanceof Error) {
		console.log('Unhandled Rejection');
		console.log(reason);
	} else console.log('Unhandled Rejection at:', promise, 'reason:', reason);
});

// start the app
await app.start();

// shutdown process
async function shutdown() {
	logger('shutting down');

	await app.stop();

	process.exit(0);
}
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
