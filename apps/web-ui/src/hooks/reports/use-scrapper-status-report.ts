import useReport from '../use-report';
import useSubject from '../use-subject';

export default function useScrapperOverviewReport() {
	const report = useReport('SCRAPPER_STATUS', 'scrapper-status', {});

	return useSubject(report?.status);
}
