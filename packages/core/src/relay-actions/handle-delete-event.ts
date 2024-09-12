import { Filter, NostrEvent, kinds } from 'nostr-tools';

import { IEventStore } from '../sqlite-event-store/interface.js';

/**
 * handles kind 5 delete events
 * @param doseMatch if this returns true the event will be deleted
 */
export function handleDeleteEvent(
	eventStore: IEventStore,
	deleteEvent: NostrEvent,
	doseMatch?: (event: NostrEvent) => boolean,
) {
	if (deleteEvent.kind !== kinds.EventDeletion) return [];

	const events = new Map<string, NostrEvent>();

	const ids = deleteEvent.tags.filter((t) => t[0] === 'e' && t[1]).map((t) => t[1]);
	if (ids.length) {
		const eventsFromIds = eventStore.getEventsForFilters([{ ids, until: deleteEvent.created_at }]);
		for (const event of eventsFromIds) events.set(event.id, event);
	}

	const cords = deleteEvent.tags
		.filter((t) => t[0] === 'a' && t[1])
		.map((t) => t[1].split(':'))
		.filter((cord) => cord.length === 3);

	if (cords.length) {
		const eventsFromCords = eventStore.getEventsForFilters(
			cords.map(([kind, pubkey, d]) => {
				return {
					'#d': [d],
					kinds: [parseInt(kind)],
					authors: [pubkey],
					until: deleteEvent.created_at,
				} satisfies Filter;
			}),
		);
		for (const event of eventsFromCords) events.set(event.id, event);
	}

	const deleteIds: string[] = [];
	for (const [id, event] of events) {
		// delete the target event if the delete event was signed by the community or original author
		if (doseMatch?.(event) || event.pubkey === deleteEvent.pubkey) {
			deleteIds.push(event.id);
		}
	}

	eventStore.addEvent(deleteEvent);
	eventStore.removeEvents(deleteIds);
	return deleteIds;
}
