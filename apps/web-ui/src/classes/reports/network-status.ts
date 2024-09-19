import { ReportResults } from '@satellite-earth/core/types';
import Report from '../report';
import Subject from '../subject';

export default class NetworkStatusReport extends Report<'NETWORK_STATUS'> {
	readonly type = 'NETWORK_STATUS';

	status = new Subject<ReportResults['NETWORK_STATUS']>();

	handleResult(response: ReportResults['NETWORK_STATUS']): void {
		this.status.next(response);
	}
}
