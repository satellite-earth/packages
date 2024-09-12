import useReport from '../use-report';
import useSubject from '../use-subject';

export default function useNotificationChannelsReport() {
	const report = useReport('NOTIFICATION_CHANNELS', 'notification-channels', {});
	const channels = useSubject(report?.channels);

	return { channels, report };
}
