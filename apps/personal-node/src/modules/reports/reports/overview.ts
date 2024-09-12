import { NostrEvent } from 'nostr-tools';
import { ReportArguments } from '@satellite-earth/core/types/control-api/reports.js';

import Report from '../report.js';

export default class OverviewReport extends Report<'OVERVIEW'> {
	readonly type = 'OVERVIEW';

	async setup() {
		const listener = (event: NostrEvent) => {
			// update summary for pubkey
			const result = this.app.database.db
				.prepare<
					[string],
					{ pubkey: string; events: number; active: number }
				>(`SELECT pubkey, COUNT(events.id) as \`events\`, MAX(created_at) as \`active\` FROM events WHERE pubkey=?`)
				.get(event.pubkey);

			if (result) this.send(result);
		};

		this.app.eventStore.on('event:inserted', listener);
		return () => {
			this.app.eventStore.off('event:inserted', listener);
		};
	}

	async execute(args: ReportArguments['OVERVIEW']) {
		const results = await this.app.database.db
			.prepare<
				[],
				{ pubkey: string; events: number; active: number }
			>(`SELECT pubkey, COUNT(events.id) as \`events\`, MAX(created_at) as \`active\` FROM events GROUP BY pubkey ORDER BY \`events\` DESC`)
			.all();

		for (const result of results) {
			this.send(result);
		}
	}
}
