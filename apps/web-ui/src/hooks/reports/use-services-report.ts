import useReport from '../use-report';
import useSubject from '../use-subject';

export default function useServicesReport() {
	const report = useReport('SERVICES', `services`, {});

	return useSubject(report?.services);
}
