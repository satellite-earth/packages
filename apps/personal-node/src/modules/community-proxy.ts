import { type Database } from 'better-sqlite3';
import { Debugger } from 'debug';
import { Filter, NostrEvent, Relay, kinds } from 'nostr-tools';
import { NostrRelay, RelayActions } from '@satellite-earth/core';
import { Subscription } from 'nostr-tools/abstract-relay';

import { LabeledEventStore } from './labeled-event-store.js';
import { HyperConnectionManager } from './hyper-connection-manager.js';
import { logger } from '../logger.js';

/** Used to connect to and sync with remote communities */
export class CommunityProxy {
	log: Debugger;
	database: Database;
	connectionManager: HyperConnectionManager;
	definition: NostrEvent;

	upstream?: Relay;
	eventStore: LabeledEventStore;
	relay: NostrRelay;

	get addresses() {
		return this.definition.tags.filter((t) => t[0] === 'r' && t[1]).map((t) => t[1]);
	}

	constructor(database: Database, communityDefinition: NostrEvent, connectionManager: HyperConnectionManager) {
		this.database = database;
		this.connectionManager = connectionManager;
		this.definition = communityDefinition;
		this.log = logger.extend('community-proxy:' + communityDefinition.pubkey);

		this.eventStore = new LabeledEventStore(this.database, communityDefinition.pubkey);
		this.eventStore.setup();
		this.relay = new NostrRelay(this.eventStore);

		// handle incoming events and pass them to the upstream relay
		this.relay.registerEventHandler(async (ctx, next) => {
			// send event to upstream relay
			if (this.upstream) {
				const result = this.upstream.publish(ctx.event);
				this.log('Sent event to upstream', ctx.event.id);
				return result;
			} else throw new Error('Not connected to upstream');
		});

		this.relay.on('subscription:created', (subscription, ws) => {
			this.syncChannelsFromFilters(subscription.filters);
		});
		this.relay.on('subscription:updated', (subscription, ws) => {
			this.syncChannelsFromFilters(subscription.filters);
		});
	}

	protected async connectUpstream() {
		if (this.upstream) {
			if (this.upstream.connected) this.upstream.close();
			this.upstream = undefined;
		}

		const hyperAddress = this.definition.tags.find((t) => t[0] === 'r' && t[1] && t[2] === 'hyper')?.[1];
		let address = this.definition.tags.find((t) => t[0] === 'r' && t[1].startsWith('ws'))?.[1];

		if (hyperAddress) {
			const serverInfo = await this.connectionManager.getLocalAddress(hyperAddress);
			address = new URL(`ws://${serverInfo.address}:${serverInfo.port}`).toString();
		}

		if (!address) throw new Error('Failed to find connection address');

		try {
			this.log('Connecting to upstream', address);
			this.upstream = await Relay.connect(address);

			this.upstream.onclose = () => {
				this.log('Upstream connection closed');
				this.upstream = undefined;
			};
		} catch (error) {
			this.log('Failed to connect to upstream');
			if (error instanceof Error) this.log(error);
		}
	}

	async connect() {
		if (this.upstream) return;
		await this.connectUpstream();

		setTimeout(() => {
			this.syncMetadata();
			this.syncDeletions();
		}, 100);
	}

	handleEvent(event: NostrEvent) {
		try {
			switch (event.kind) {
				case kinds.EventDeletion:
					this.handleDeleteEvent(event);
					break;
				default:
					this.eventStore.addEvent(event);
					break;
			}
		} catch (error) {
			this.log('Failed to handle event');
			console.log(error);
		}
	}

	handleDeleteEvent(deleteEvent: NostrEvent) {
		const communityPubkey = this.definition.pubkey;

		const ids = RelayActions.handleDeleteEvent(
			this.eventStore,
			deleteEvent,
			deleteEvent.pubkey === communityPubkey ? () => true : undefined,
		);

		if (ids.length) this.log(`Deleted`, ids.length, 'events');
	}

	syncMetadata() {
		if (!this.upstream) return;

		this.log('Opening subscription to sync metadata');
		this.upstream.subscribe([{ kinds: [kinds.Metadata, kinds.RelayList, 12012, 39000, 39001, 39002] }], {
			// @ts-expect-error
			id: 'metadata-sync',
			onevent: (event) => this.handleEvent(event),
			onclose: () => this.log('Closed metadata sync'),
		});
	}

	syncDeletions() {
		if (!this.upstream) return;

		this.log('Opening subscription to sync deletions');

		this.upstream.subscribe([{ kinds: [kinds.EventDeletion] }], {
			// @ts-expect-error
			id: 'deletion-sync',
			onevent: (event) => this.handleEvent(event),
			onclose: () => this.log('Closed deletion sync'),
		});
	}

	private syncChannelsFromFilters(filters: Filter[]) {
		const channels = new Set<string>();
		for (const filter of filters) {
			if (filter['#h']) filter['#h'].forEach((c) => channels.add(c));
		}
		for (const channel of channels) {
			this.syncChannel(channel);
		}
	}

	channelSubs = new Map<string, Subscription>();
	syncChannel(channel: string) {
		if (!this.upstream) return;
		if (this.channelSubs.has(channel)) return;

		this.log('Opening subscription to sync channel', channel);
		const sub = this.upstream.subscribe([{ kinds: [9, 10, 11, 12], '#h': [channel] }], {
			// @ts-expect-error
			id: `channel-${channel}-sync`,
			onevent: (event) => this.eventStore.addEvent(event),
			onclose: () => {
				this.channelSubs.delete(channel);
			},
		});

		this.channelSubs.set(channel, sub);
	}

	stop() {
		this.upstream?.close();
	}
}
