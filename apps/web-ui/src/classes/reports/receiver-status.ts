import { ReportResults } from '@satellite-earth/core/types/control-api/reports.js';
import Report from '../report';
import Subject from '../subject';

export default class ReceiverStatusReport extends Report<'RECEIVER_STATUS'> {
	readonly type = 'RECEIVER_STATUS';

	status = new Subject<ReportResults['RECEIVER_STATUS']>();

	handleResult(response: ReportResults['RECEIVER_STATUS']): void {
		this.status.next(response);
	}
}
