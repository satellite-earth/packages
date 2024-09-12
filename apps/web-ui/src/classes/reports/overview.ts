import { ReportResults } from '@satellite-earth/core/types/control-api/reports.js';
import Report from '../report';
import Subject from '../subject';

export default class OverviewReport extends Report<'OVERVIEW'> {
	type = 'OVERVIEW' as const;

	value = new Subject<ReportResults['OVERVIEW'][]>();

	handleResult(response: ReportResults['OVERVIEW']): void {
		// remove duplicates
		const next = this.value.value?.filter((r) => r.pubkey !== response.pubkey).concat(response) ?? [response];
		const sorted = next.sort((a, b) => b.events - a.events);

		this.value.next(sorted);
	}
}
