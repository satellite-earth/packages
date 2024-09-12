import EventEmitter from 'events';
import { NostrEvent, SimplePool } from 'nostr-tools';
import dayjs from 'dayjs';

import { IEventStore } from '@satellite-earth/core';
import { COMMUNITY_DEFINITION_KIND } from '../const.js';
import { getTagValue } from '../helpers/event.js';
import Signer from './signer.js';

export type CommunityMetadata = {
	name: string;
	about: string;
	banner: string;
	image: string;
	owner: string;
	admins: string[];
};

type EventMap = {
	adminsChange: [string[]];
};

export class CommunityConfig extends EventEmitter<EventMap> {
	signer: Signer;
	eventStore: IEventStore;
	relayPool: SimplePool;

	metadata: CommunityMetadata;
	relays: string[] = [];

	constructor(eventStore: IEventStore, signer: Signer, relayPool: SimplePool) {
		super();

		this.eventStore = eventStore;
		this.signer = signer;
		this.relayPool = relayPool;

		const definitionEvent = eventStore.getEventsForFilters([
			{ kinds: [COMMUNITY_DEFINITION_KIND], authors: [signer.getPublicKey()] },
		])?.[0] as NostrEvent | undefined;
		if (!definitionEvent) throw new Error('Cant find 12012 event in store');

		this.metadata = {
			name: getTagValue(definitionEvent, 'name') ?? '',
			about: getTagValue(definitionEvent, 'about') ?? '',
			banner: getTagValue(definitionEvent, 'banner') ?? '',
			image: getTagValue(definitionEvent, 'image') ?? '',
			owner: getTagValue(definitionEvent, 'owner') ?? '',
			admins: definitionEvent.tags.filter((t) => t[0] === 'admin' && t[1]).map((t) => t[1]),
		};
	}

	async saveDefinitionEvent(additionalTags: string[][] = []) {
		const definitionEvent = await this.signer.signEvent({
			kind: COMMUNITY_DEFINITION_KIND,
			content: '',
			tags: [
				['name', this.metadata.name],
				['about', this.metadata.about],
				['image', this.metadata.image],
				['banner', this.metadata.banner],
				['owner', this.metadata.owner],
				...this.metadata.admins.map((pubkey) => ['admin', pubkey]),
				...additionalTags,
				// NIP-31 alt tag
				['alt', 'This event defines a satellite.earth community'],
			],
			created_at: dayjs().unix(),
		});

		this.eventStore.addEvent(definitionEvent);
		return definitionEvent;
	}

	/** save and publish community definition event to nostr */
	async publish(relays = this.relays, additionalTags: string[][] = []) {
		const definitionEvent = await this.saveDefinitionEvent(additionalTags);
		return Promise.all(this.relayPool.publish(relays, definitionEvent));
	}
}
