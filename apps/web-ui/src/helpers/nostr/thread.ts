import dayjs from 'dayjs';
import { NostrEvent } from 'nostr-tools';
import { sortByDate } from '@satellite-earth/core/helpers/nostr/event.js';

export function groupMessages(messages: NostrEvent[], minutes = 5, ascending = false) {
	const sorted = messages.sort(sortByDate);

	const groups: { id: string; pubkey: string; events: NostrEvent[] }[] = [];
	for (const message of sorted) {
		const last = groups[groups.length - 1];
		if (last && last.pubkey === message.pubkey) {
			const lastEvent = last.events[last.events.length - 1];
			if (lastEvent && dayjs.unix(lastEvent.created_at).diff(dayjs.unix(message.created_at), 'minute') < minutes) {
				last.events.push(message);
				continue;
			}
		}

		const group = { id: message.id, pubkey: message.pubkey, events: [message] };
		groups.push(group);
	}

	if (ascending) {
		for (const group of groups) group.events.reverse();
		return groups.reverse();
	} else return groups;
}
