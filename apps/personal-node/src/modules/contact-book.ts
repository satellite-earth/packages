import { NostrEvent, kinds } from 'nostr-tools';
import _throttle from 'lodash.throttle';

import { COMMON_CONTACT_RELAYS } from '../env.js';
import { logger } from '../logger.js';
import App from '../app/index.js';
import PubkeyBatchLoader from './pubkey-batch-loader.js';

/** Loads 3 contact lists for pubkeys */
export default class ContactBook {
	log = logger.extend('ContactsBook');
	app: App;
	loader: PubkeyBatchLoader;
	extraRelays = COMMON_CONTACT_RELAYS;

	constructor(app: App) {
		this.app = app;

		this.loader = new PubkeyBatchLoader(kinds.Contacts, this.app.pool, (pubkey) => {
			return this.app.eventStore.getEventsForFilters([{ kinds: [kinds.Contacts], authors: [pubkey] }])?.[0];
		});

		this.loader.on('event', (event) => this.app.eventStore.addEvent(event));
		this.loader.on('batch', (found, failed) => {
			this.log(`Found ${found}, failed ${failed}, pending ${this.loader.queue}`);
		});
	}

	getContacts(pubkey: string) {
		return this.loader.getEvent(pubkey);
	}

	getFollowedPubkeys(pubkey: string): string[] {
		const contacts = this.getContacts(pubkey);
		if (contacts) {
			return contacts.tags
				.filter((tag) => {
					return tag[0] === 'p';
				})
				.map((tag) => {
					return tag[1];
				});
		}
		return [];
	}

	handleEvent(event: NostrEvent) {
		this.loader.handleEvent(event);
	}

	async loadContacts(pubkey: string, relays: string[] = []) {
		return this.loader.getOrLoadEvent(pubkey, relays);
	}
}
