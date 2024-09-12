import dayjs from 'dayjs';
import { EventTemplate } from 'nostr-tools';

import { IEventStore } from '@satellite-earth/core';
import { getTagValue } from '../helpers/event.js';
import { logger } from '../logger.js';
import Signer from './signer.js';
import { DeletionManager } from './deletion-manager.js';

export const CHANNEL_METADATA_KIND = 39000;

export type Channel = {
	id: string;
	metadata: {
		name?: string;
		picture?: string;
		about?: string;
	};
	updated_at: number;
	public: boolean;
	open: boolean;
};

export class ChannelManager {
	log = logger.extend('channel-manager');
	signer: Signer;
	eventStore: IEventStore;
	deletionManager: DeletionManager;

	channels: Record<string, Channel> = {};

	constructor(eventStore: IEventStore, signer: Signer, deletionManager: DeletionManager) {
		this.signer = signer;
		this.eventStore = eventStore;
		this.deletionManager = deletionManager;
	}

	setup() {
		// read existing channels
		const pubkey = this.signer.getPublicKey();

		const channelMetadata = this.eventStore.getEventsForFilters([
			{ kinds: [CHANNEL_METADATA_KIND], authors: [pubkey] },
		]);

		for (const event of channelMetadata) {
			const id = getTagValue(event, 'd');
			const name = getTagValue(event, 'name');
			const picture = getTagValue(event, 'picture');
			const about = getTagValue(event, 'about');

			const isPublic = event.tags.some((t) => t[0] === 'public');
			const open = event.tags.some((t) => t[0] === 'open');

			if (!id) continue;

			this.channels[id] = {
				id,
				metadata: { name, picture, about },
				updated_at: event.created_at,
				open,
				public: isPublic,
			};
		}
	}

	protected buildEventForChannel(channel: Channel): EventTemplate {
		const tags: string[][] = [];

		tags.push(['d', channel.id]);
		if (channel.metadata.name) tags.push(['name', channel.metadata.name]);
		if (channel.metadata.about) tags.push(['about', channel.metadata.about]);
		if (channel.metadata.picture) tags.push(['picture', channel.metadata.picture]);
		if (channel.public) tags.push(['public']);
		else tags.push(['private']);
		if (channel.open) tags.push(['open']);
		else tags.push(['close']);

		return {
			content: '',
			created_at: dayjs().unix(),
			tags,
			kind: CHANNEL_METADATA_KIND,
		};
	}

	async saveChannel(id: string) {
		const channel = this.channels[id];
		if (!channel) throw new Error(`Missing channel ${id}`);

		const event = await this.signer.signEvent(this.buildEventForChannel(channel));
		channel.updated_at = event.created_at;
		this.eventStore.addEvent(event);
		return event;
	}

	get channelPrefix() {
		return this.signer.getPublicKey().slice(0, 8);
	}

	validateChannelId(id: string) {
		const valid = id.startsWith(this.channelPrefix + '-');
		if (!valid) throw new Error('Community prefix missing');
	}

	getChannel(id: string): Channel | undefined {
		return this.channels[id];
	}

	createChannel(id: string, metadata: Channel['metadata'] = {}) {
		this.validateChannelId(id);
		this.log('Creating channel', id);
		const channel: Channel = { id, metadata, public: true, open: true, updated_at: dayjs().unix() };

		this.channels[id] = channel;
		return this.saveChannel(id);
	}

	updateChannel(id: string, metadata: Channel['metadata']) {
		this.validateChannelId(id);
		const channel = this.channels[id];
		if (!channel) throw new Error(`Missing channel ${id}`);

		Object.assign(channel.metadata, metadata);
		return this.saveChannel(id);
	}

	purgeChannel(id: string) {
		this.log('Removing channel', id);
		const pubkey = this.signer.getPublicKey();

		// remove all events with ["h",<channel-id>]
		const messages = this.eventStore.getEventsForFilters([{ '#h': [id] }]);
		const channelMetadataCoordinate = `${CHANNEL_METADATA_KIND}:${pubkey}:${id}`;

		this.deletionManager.deleteEvents(
			{ ids: messages.map((e) => e.id), coordinates: [channelMetadataCoordinate] },
			`Remove channel ${id}`,
		);
		delete this.channels[id];
	}
}
