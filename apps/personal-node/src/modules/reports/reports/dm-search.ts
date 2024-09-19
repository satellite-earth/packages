import { ReportArguments } from '@satellite-earth/core/types';
import Report from '../report.js';

export default class DMSearchReport extends Report<'DM_SEARCH'> {
	readonly type = 'DM_SEARCH';

	async execute(args: ReportArguments['DM_SEARCH']) {
		const results = await this.app.decryptionCache.search(args.query, args);
		for (const result of results) this.send(result);
	}
}
