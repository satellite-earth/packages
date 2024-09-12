import { ReportResults } from '@satellite-earth/core/types/control-api/reports.js';
import Report from '../report';
import Subject from '../subject';

export default class ScrapperStatusReport extends Report<'SCRAPPER_STATUS'> {
	readonly type = 'SCRAPPER_STATUS';

	status = new Subject<ReportResults['SCRAPPER_STATUS']>();

	handleResult(response: ReportResults['SCRAPPER_STATUS']): void {
		this.status.next(response);
	}
}
