import { ReportArguments, ReportResults } from '@satellite-earth/core/types';
import { NostrEvent } from 'nostr-tools';
import { getTagValue } from '@satellite-earth/core/helpers/nostr';
import SuperMap from '@satellite-earth/core/helpers/super-map.js';

import Report from '../report.js';

export default class ConversationsReport extends Report<'CONVERSATIONS'> {
	readonly type = 'CONVERSATIONS';

	private async getConversationResult(self: string, other: string) {
		const sent = this.app.database.db
			.prepare<[string, string], { pubkey: string; count: number; lastMessage: number }>(
				`
				SELECT tags.v as pubkey, count(events.id) as count, max(events.created_at) as lastMessage FROM tags
				INNER JOIN events ON events.id = tags.e
				WHERE events.kind = 4 AND tags.t = 'p' AND events.pubkey = ? AND tags.v = ?`,
			)
			.get(self, other);

		const received = this.app.database.db
			.prepare<[string, string], { pubkey: string; count: number; lastMessage: number }>(
				`
				SELECT events.pubkey, count(events.id) as count, max(events.created_at) as lastMessage FROM events
				INNER JOIN tags ON tags.e = events.id
				WHERE events.kind = 4 AND tags.t = 'p' AND tags.v = ? AND events.pubkey = ?`,
			)
			.get(self, other);

		const result: ReportResults['CONVERSATIONS'] = {
			pubkey: other,
			count: (received?.count ?? 0) + (sent?.count ?? 0),
			sent: 0,
			received: 0,
		};

		if (received) {
			result.received = received.count;
			result.lastReceived = received.lastMessage;
		}
		if (sent) {
			result.sent = sent.count;
			result.lastSent = sent.lastMessage;
		}

		return result;
	}
	private async getAllConversationResults(self: string) {
		const sent = this.app.database.db
			.prepare<[string], { pubkey: string; count: number; lastMessage: number }>(
				`
				SELECT tags.v as pubkey, count(tags.v) as count, max(events.created_at) as lastMessage FROM tags
				INNER JOIN events ON events.id = tags.e
				WHERE events.kind = 4 AND tags.t = 'p' AND events.pubkey = ?
				GROUP BY tags.v`,
			)
			.all(self);

		const received = this.app.database.db
			.prepare<[string], { pubkey: string; count: number; lastMessage: number }>(
				`
				SELECT events.pubkey, count(events.pubkey) as count, max(events.created_at) as lastMessage FROM events
				INNER JOIN tags ON tags.e = events.id
				WHERE events.kind = 4 AND tags.t = 'p' AND tags.v = ?
				GROUP BY events.pubkey`,
			)
			.all(self);

		const results = new SuperMap<string, ReportResults['CONVERSATIONS']>((pubkey) => ({
			pubkey,
			count: sent.length + received.length,
			sent: 0,
			received: 0,
		}));

		for (const { pubkey, count, lastMessage } of received) {
			const result = results.get(pubkey);
			result.received = count;
			result.lastReceived = lastMessage;
		}
		for (const { pubkey, count, lastMessage } of sent) {
			const result = results.get(pubkey);
			result.sent = count;
			result.lastSent = lastMessage;
		}

		return Array.from(results.values()).sort(
			(a, b) => Math.max(b.lastReceived ?? 0, b.lastSent ?? 0) - Math.max(a.lastReceived ?? 0, a.lastSent ?? 0),
		);
	}

	async setup(args: ReportArguments['CONVERSATIONS']) {
		const listener = (event: NostrEvent) => {
			const from = event.pubkey;
			const to = getTagValue(event, 'p');
			if (!to) return;

			const self = args.pubkey;

			// get the latest stats from the database
			this.getConversationResult(self, self === from ? to : from).then((result) => this.send(result));
		};

		this.app.directMessageManager.on('message', listener);
		return () => this.app.directMessageManager.off('message', listener);
	}

	async execute(args: ReportArguments['CONVERSATIONS']) {
		const results = await this.getAllConversationResults(args.pubkey);

		for (const result of results) {
			this.send(result);
		}
	}
}
