import App from '../../app/index.js';
import { NostrEvent } from 'nostr-tools';
import { EventEmitter } from 'events';
import { Debugger } from 'debug';

import { getOutboxes } from '@satellite-earth/core/helpers/nostr/mailboxes.js';
import PubkeyRelayScrapper, { PubkeyRelayScrapperState } from './pubkey-relay-scrapper.js';
import { logger } from '../../logger.js';

type EventMap = {
	event: [NostrEvent];
};

export default class PubkeyScrapper extends EventEmitter<EventMap> {
	app: App;
	pubkey: string;
	additionalRelays: string[] = [];
	log: Debugger;

	private failed = new Set<string>();
	relayScrappers = new Map<string, PubkeyRelayScrapper>();

	constructor(app: App, pubkey: string) {
		super();
		this.app = app;
		this.pubkey = pubkey;

		this.log = logger.extend('scrapper:' + this.pubkey);
	}

	async ensureData() {
		// get mailboxes
		this.app.profileBook.loadProfile(this.pubkey);
		const mailboxes = await this.app.addressBook.loadMailboxes(this.pubkey);

		return { mailboxes };
	}

	async loadNext() {
		const { mailboxes } = await this.ensureData();

		const outboxes = getOutboxes(mailboxes);

		const relays = [...outboxes, ...this.additionalRelays];
		const scrappers: PubkeyRelayScrapper[] = [];
		for (const url of relays) {
			if (this.failed.has(url)) continue;

			try {
				let scrapper = this.relayScrappers.get(url);
				if (!scrapper) {
					const relay = await this.app.pool.ensureRelay(url);
					scrapper = new PubkeyRelayScrapper(this.pubkey, relay);
					scrapper.on('event', (event) => this.emit('event', event));

					// load the state from the database
					const state = await this.app.state.getMutableState<PubkeyRelayScrapperState>(
						`${this.pubkey}|${relay.url}`,
						{},
					);
					if (state) scrapper.state = state.proxy;

					this.relayScrappers.set(url, scrapper);
				}

				scrappers.push(scrapper);
			} catch (error) {
				this.failed.add(url);
				if (error instanceof Error) this.log(`Failed to create relay scrapper for ${url}`, error.message);
			}
		}

		// call loadNext on the one with the latest cursor
		const incomplete = scrappers
			.filter((s) => !s.complete && !s.running && !s.error)
			.sort((a, b) => b.cursor - a.cursor);

		const next = incomplete[0];
		if (next) {
			await next.loadNext();
		}
	}
}
