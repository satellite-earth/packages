import useReport from '../use-report';
import useSubject from '../use-subject';

export default function useLogsReport(service?: string) {
	const report = useReport('LOGS', `logs-${service || 'all'}`, { service });

	const logs = useSubject(report?.entries);
	return { report, logs };
}
