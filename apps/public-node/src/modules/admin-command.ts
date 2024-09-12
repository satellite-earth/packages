import { HandlerContext, HandlerNext, NostrRelay } from '@satellite-earth/core';
import { ChannelManager } from './channel-manager.js';
import { getTagValue } from '../helpers/event.js';
import { logger } from '../logger.js';

export const EDIT_METADATA_KIND = 9002;
export const SET_CHANNEL_STATUS_KIND = 9006;

export class AdminCommands {
	log = logger.extend('admin-commands');
	relay: NostrRelay;
	channelManager: ChannelManager;

	constructor(relay: NostrRelay, channelManager: ChannelManager) {
		this.relay = relay;
		this.channelManager = channelManager;

		this.relay.registerEventHandler(this.purgeChannel.bind(this));
		this.relay.registerEventHandler(this.setChannelMetadata.bind(this));
		this.relay.registerEventHandler(this.setChannelStatus.bind(this));
	}

	protected purgeChannel(ctx: HandlerContext, next: HandlerNext) {
		const { event } = ctx;
		if (event.kind !== SET_CHANNEL_STATUS_KIND) return next();

		const isPurge = event.tags.some((t) => t[0] === 'purge');
		if (!isPurge) return next();

		const id = getTagValue(event, 'h');
		if (!id) return;

		const channel = this.channelManager.getChannel(id);
		if (channel && channel.updated_at < event.created_at) {
			this.log('Purging channel', id);
			this.channelManager.purgeChannel(id);
		}
	}

	protected setChannelMetadata(ctx: HandlerContext, next: HandlerNext) {
		const { event } = ctx;
		if (event.kind !== EDIT_METADATA_KIND) return next();

		const id = getTagValue(event, 'h');
		if (!id) return;

		const name = getTagValue(event, 'name');
		const about = getTagValue(event, 'about');
		const picture = getTagValue(event, 'picture');

		const channel = this.channelManager.getChannel(id);
		if (channel) {
			// only update the channel if the command is newer
			if (channel.updated_at < event.created_at) {
				this.log('Updating channel', id);
				this.channelManager.updateChannel(id, { name, about, picture });
			}
		} else {
			this.log('Creating channel', id);
			this.channelManager.createChannel(id, { name, about, picture });
		}
	}

	protected setChannelStatus(ctx: HandlerContext, next: HandlerNext) {
		const { event } = ctx;
		if (event.kind !== SET_CHANNEL_STATUS_KIND) return next();

		const id = getTagValue(event, 'h');
		if (!id) return;

		const channel = this.channelManager.getChannel(id);
		if (channel && channel.updated_at < event.created_at) {
			const isPublic = event.tags.some((t) => t[0] === 'public');
			const isOpen = event.tags.some((t) => t[0] === 'open');

			this.log('Changing channel status', isPublic, isOpen);

			channel.public = isPublic;
			channel.open = isOpen;

			this.channelManager.saveChannel(id);
		}
	}
}
