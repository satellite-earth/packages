import useReport from '../use-report';
import useSubject from '../use-subject';

export default function useOverviewReport() {
	// hardcode the report id to 'overview' so there is only ever one
	const report = useReport('OVERVIEW', 'overview', {});

	return useSubject(report?.value);
}
