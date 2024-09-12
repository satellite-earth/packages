import Report from '../report';
import { ReportResults } from '@satellite-earth/core/types/control-api/reports.js';
import { getDMRecipient, getDMSender } from '@satellite-earth/core/helpers/nostr/dms.js';

import { PersistentSubject } from '../subject';

function sortPubkeys(a: string, b: string): [string, string] {
	if (a < b) return [a, b];
	else return [b, a];
}

export type ConversationResult = {
	id: string;
	pubkeys: [string, string];
	results: ReportResults['DM_SEARCH'][];
};

export class DMSearchReport extends Report<'DM_SEARCH'> {
	readonly type = 'DM_SEARCH';

	results = new PersistentSubject<ReportResults['DM_SEARCH'][]>([]);
	conversations = new PersistentSubject<ConversationResult[]>([]);

	onFire() {
		this.results.next([]);
		this.conversations.next([]);
	}
	handleResult(result: ReportResults['DM_SEARCH']) {
		this.results.next([...this.results.value, result]);

		// add to conversations
		const sender = getDMSender(result.event);
		const recipient = getDMRecipient(result.event);

		const pubkeys = sortPubkeys(sender, recipient);
		const id = pubkeys.join(':');

		if (this.conversations.value.some((c) => c.id === id)) {
			// replace the conversation object
			this.conversations.next(
				this.conversations.value.map((c) => {
					if (c.id === id) return { id, pubkeys, results: [...c.results, result] };
					return c;
				}),
			);
		} else {
			// add new conversation
			this.conversations.next([...this.conversations.value, { id, pubkeys, results: [result] }]);
		}
	}
}
