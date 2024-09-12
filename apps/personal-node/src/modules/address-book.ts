import { NostrEvent, kinds } from 'nostr-tools';
import _throttle from 'lodash.throttle';

import { getInboxes, getOutboxes } from '@satellite-earth/core/helpers/nostr/mailboxes.js';
import { logger } from '../logger.js';
import App from '../app/index.js';
import PubkeyBatchLoader from './pubkey-batch-loader.js';

/** Loads 10002 events for pubkeys */
export default class AddressBook {
	log = logger.extend('AddressBook');
	app: App;
	loader: PubkeyBatchLoader;

	get extraRelays() {
		return this.loader.extraRelays;
	}
	set extraRelays(v: string[]) {
		this.loader.extraRelays = v;
	}

	constructor(app: App) {
		this.app = app;

		this.loader = new PubkeyBatchLoader(kinds.RelayList, this.app.pool, (pubkey) => {
			return this.app.eventStore.getEventsForFilters([{ kinds: [kinds.RelayList], authors: [pubkey] }])?.[0];
		});

		this.loader.on('event', (event) => this.app.eventStore.addEvent(event));
		this.loader.on('batch', (found, failed) => {
			this.log(`Found ${found}, failed ${failed}, pending ${this.loader.queue}`);
		});
	}

	getMailboxes(pubkey: string) {
		return this.loader.getEvent(pubkey);
	}

	getOutboxes(pubkey: string) {
		const mailboxes = this.getMailboxes(pubkey);
		return mailboxes && getOutboxes(mailboxes);
	}

	getInboxes(pubkey: string) {
		const mailboxes = this.getMailboxes(pubkey);
		return mailboxes && getInboxes(mailboxes);
	}

	handleEvent(event: NostrEvent) {
		this.loader.handleEvent(event);
	}

	async loadMailboxes(pubkey: string, relays?: string[]) {
		return this.loader.getOrLoadEvent(pubkey, relays);
	}

	async loadOutboxes(pubkey: string, relays?: string[]) {
		const mailboxes = await this.loadMailboxes(pubkey, relays);
		return mailboxes && getOutboxes(mailboxes);
	}

	async loadInboxes(pubkey: string, relays?: string[]) {
		const mailboxes = await this.loadMailboxes(pubkey, relays);
		return mailboxes && getInboxes(mailboxes);
	}
}
