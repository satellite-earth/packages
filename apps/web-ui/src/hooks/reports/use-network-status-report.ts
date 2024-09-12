import useReport from '../use-report';
import useSubject from '../use-subject';

export default function useNetworkOverviewReport() {
	const report = useReport('NETWORK_STATUS', 'network-status', {});

	return useSubject(report?.status);
}
