import { EventTemplate, NostrEvent, kinds } from 'nostr-tools';
import dayjs from 'dayjs';
import EventEmitter from 'events';
import { IEventStore, RelayActions } from '@satellite-earth/core';

import Signer from './signer.js';
import { logger } from '../logger.js';

type EventMap = {
	deleteEvent: [NostrEvent];
};

export class DeletionManager extends EventEmitter<EventMap> {
	log = logger.extend('deletion-manager');
	eventStore: IEventStore;
	signer: Signer;

	constructor(eventStore: IEventStore, signer: Signer) {
		super();
		this.eventStore = eventStore;
		this.signer = signer;
	}

	/** handle a kind 5 event for a community */
	handleEvent(deleteEvent: NostrEvent) {
		if (deleteEvent.kind !== kinds.EventDeletion) return;

		const communityPubkey = this.signer.getPublicKey();
		const ids = RelayActions.handleDeleteEvent(
			this.eventStore,
			deleteEvent,
			deleteEvent.pubkey === communityPubkey ? () => true : undefined
		);

		this.log(`Deleted`, ids.length, 'events');
	}

	async deleteEvents({ ids = [], coordinates = [] }: { ids?: string[]; coordinates?: string[] }, message = 'Deleted') {
		const draft: EventTemplate = {
			kind: kinds.EventDeletion,
			created_at: dayjs().unix(),
			tags: [...ids.map((id) => ['e', id]), ...coordinates.map((coordinate) => ['a', coordinate])],
			content: message,
		};

		const signed = await this.signer.signEvent(draft);

		this.handleEvent(signed);
		this.emit('deleteEvent', signed);
		return signed;
	}
}
