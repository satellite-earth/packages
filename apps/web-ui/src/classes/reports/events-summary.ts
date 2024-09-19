import { ReportResults } from '@satellite-earth/core/types';
import Report from '../report';
import Subject from '../subject';

export default class EventsSummaryReport extends Report<'EVENTS_SUMMARY'> {
	readonly type = 'EVENTS_SUMMARY';

	events = new Subject<ReportResults['EVENTS_SUMMARY'][]>();

	onFire(): void {
		this.events.next([]);
	}

	handleResult(result: ReportResults['EVENTS_SUMMARY']): void {
		if (this.events.value) this.events.next([...this.events.value, result]);
		else this.events.next([result]);
	}
}
