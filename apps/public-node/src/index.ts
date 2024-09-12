#!/usr/bin/env node
import './polyfill.js';
import { type AppType } from './app/index.js';
import { type SetupAppType } from './setup/index.js';
import { logger } from './logger.js';

let app: AppType | SetupAppType;
try {
	app = (await import('./app/index.js')).default;
} catch (error) {
	console.log(error);
	logger('Failed to start app, switching to setup mode');
	app = (await import('./setup/index.js')).default;
}

async function shutdown() {
	await app.shutdown();
	process.exit(0);
}
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
