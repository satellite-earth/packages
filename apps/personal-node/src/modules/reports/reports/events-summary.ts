import { ReportArguments } from '@satellite-earth/core/types';
import { EventRow, parseEventRow } from '@satellite-earth/core';
import Report from '../report.js';

export default class EventsSummaryReport extends Report<'EVENTS_SUMMARY'> {
	readonly type = 'EVENTS_SUMMARY';

	async execute(args: ReportArguments['EVENTS_SUMMARY']): Promise<void> {
		let sql = `
			SELECT
				events.*,
				COUNT(l.id) AS reactions,
				COUNT(s.id) AS shares,
				COUNT(r.id) AS replies,
				(events.kind || ':' || events.pubkey || ':' || events.d) as address
			FROM events
			LEFT JOIN tags ON ( tags.t = 'e' AND tags.v = events.id ) OR ( tags.t = 'a' AND tags.v = address )
			LEFT JOIN events AS l ON l.id = tags.e AND l.kind = 7
			LEFT JOIN events AS s ON s.id = tags.e AND (s.kind = 6 OR s.kind = 16)
			LEFT JOIN events AS r ON r.id = tags.e AND r.kind = 1
		`;

		const params: any[] = [];
		const conditions: string[] = [];

		if (args.kind !== undefined) {
			conditions.push(`events.kind = ?`);
			params.push(args.kind);
		}
		if (args.pubkey !== undefined) {
			conditions.push(`events.pubkey = ?`);
			params.push(args.pubkey);
		}

		if (conditions.length > 0) {
			sql += ` WHERE ${conditions.join(' AND ')}\n`;
		}

		sql += ' GROUP BY events.id\n';

		switch (args.order) {
			case 'created_at':
				sql += ` ORDER BY events.created_at DESC\n`;
				break;
			default:
			case 'interactions':
				sql += ` ORDER BY reactions + shares + replies DESC\n`;
				break;
		}

		let limit = args.limit || 100;
		sql += ` LIMIT ?`;
		params.push(limit);

		const rows = await this.app.database.db
			.prepare<any[], EventRow & { reactions: number; shares: number; replies: number }>(sql)
			.all(...params);

		const results = rows.map((row) => {
			const event = parseEventRow(row);

			return { event, reactions: row.reactions, shares: row.shares, replies: row.replies };
		});

		for (const result of results) {
			this.send(result);
		}
	}
}
