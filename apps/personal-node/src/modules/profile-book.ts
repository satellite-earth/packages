import { NostrEvent, kinds } from 'nostr-tools';
import _throttle from 'lodash.throttle';

import { COMMON_CONTACT_RELAYS } from '../env.js';
import { logger } from '../logger.js';
import App from '../app/index.js';
import PubkeyBatchLoader from './pubkey-batch-loader.js';

/** loads kind 0 metadata for pubkeys */
export default class ProfileBook {
	log = logger.extend('ProfileBook');
	app: App;
	loader: PubkeyBatchLoader;
	extraRelays = COMMON_CONTACT_RELAYS;

	constructor(app: App) {
		this.app = app;

		this.loader = new PubkeyBatchLoader(kinds.Metadata, this.app.pool, (pubkey) => {
			return this.app.eventStore.getEventsForFilters([{ kinds: [kinds.Metadata], authors: [pubkey] }])?.[0];
		});

		this.loader.on('event', (event) => this.app.eventStore.addEvent(event));
		this.loader.on('batch', (found, failed) => {
			this.log(`Found ${found}, failed ${failed}, pending ${this.loader.queue}`);
		});
	}

	getProfile(pubkey: string) {
		return this.loader.getEvent(pubkey);
	}

	handleEvent(event: NostrEvent) {
		this.loader.handleEvent(event);
	}

	async loadProfile(pubkey: string, relays: string[] = []) {
		return this.loader.getOrLoadEvent(pubkey, relays);
	}
}
