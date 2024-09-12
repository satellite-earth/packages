import { ReportResults } from '@satellite-earth/core/types/control-api/reports.js';
import Report from '../report';
import { PersistentSubject } from '../subject';

export default class ServicesReport extends Report<'SERVICES'> {
	readonly type = 'SERVICES';

	services = new PersistentSubject<ReportResults['SERVICES'][]>([]);

	handleResult(result: ReportResults['SERVICES']) {
		this.services.next(this.services.value.filter((s) => s.id !== result.id).concat(result));
	}
}
