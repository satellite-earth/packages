import { ReportArguments } from '@satellite-earth/core/types';
import useReport from '../use-report';
import useSubject from '../use-subject';

export default function useEventsSummaryReport(id: string, args: ReportArguments['EVENTS_SUMMARY']) {
	const report = useReport('EVENTS_SUMMARY', id, args);

	return useSubject(report?.events);
}
