import dayjs from 'dayjs';
import { EventEmitter } from 'events';
import { NostrEvent } from 'nostr-tools';
import { Debugger } from 'debug';
import { AbstractRelay, Subscription } from 'nostr-tools/abstract-relay';

import { logger } from '../../logger.js';

function stripProtocol(url: string) {
	return url.replace(/^\w+\:\/\//, '');
}

const DEFAULT_LIMIT = 1000;

export type PubkeyRelayScrapperState = {
	cursor?: number;
	complete?: boolean;
};

type EventMap = {
	event: [NostrEvent];
	chunk: [{ count: number; cursor: number }];
};

export default class PubkeyRelayScrapper extends EventEmitter<EventMap> {
	pubkey: string;
	relay: AbstractRelay;
	log: Debugger;

	running = false;
	error?: Error;
	state: PubkeyRelayScrapperState = {};

	get cursor() {
		return this.state.cursor || dayjs().unix();
	}
	set cursor(v: number) {
		this.state.cursor = v;
	}
	get complete() {
		return this.state.complete || false;
	}
	set complete(v: boolean) {
		this.state.complete = v;
	}

	private subscription?: Subscription;

	constructor(pubkey: string, relay: AbstractRelay, state?: PubkeyRelayScrapperState) {
		super();

		this.pubkey = pubkey;
		this.relay = relay;
		if (state) this.state = state;

		this.log = logger.extend('scrapper:' + pubkey + ':' + stripProtocol(relay.url));
	}

	async loadNext() {
		// don't run if its already running, complete, or has an error
		if (this.running || this.complete || this.error) return;

		this.running = true;

		// wait for relay connection
		await this.relay.connect();

		const cursor = this.state.cursor || dayjs().unix();
		this.log(`Requesting from ${dayjs.unix(cursor).format('lll')} (${cursor})`);

		// return a promise to wait for the subscription to end
		return new Promise<void>((res, rej) => {
			let count = 0;
			let newCursor = cursor;
			this.subscription = this.relay.subscribe([{ authors: [this.pubkey], until: cursor, limit: DEFAULT_LIMIT }], {
				onevent: (event) => {
					this.emit('event', event);
					count++;

					newCursor = Math.min(newCursor, event.created_at);
				},
				oneose: () => {
					this.running = false;

					// if no events where returned, mark complete
					if (count === 0) {
						// connection closed before events could be returned, ignore complete
						if (this.subscription?.closed === true) return;

						this.complete = true;
						this.log('Got 0 events, complete');
					} else {
						this.log(`Got ${count} events and moved cursor to ${dayjs.unix(newCursor).format('lll')} (${newCursor})`);
					}

					this.state.cursor = newCursor - 1;
					this.emit('chunk', { count, cursor: this.cursor });

					this.subscription?.close();
					res();
				},
				onclose: (reason) => {
					if (reason !== 'closed by caller') {
						// unexpected close
						this.log(`Error: ${reason}`);
						this.error = new Error(reason);

						rej(this.error);
					}
					res();
				},
			});
		});
	}
}
