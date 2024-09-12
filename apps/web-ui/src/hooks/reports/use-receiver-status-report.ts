import useReport from '../use-report';
import useSubject from '../use-subject';

export default function useReceiverStatusReport() {
	const report = useReport('RECEIVER_STATUS', 'receiver-status', {});

	return useSubject(report?.status);
}
