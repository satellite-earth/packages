import useReport from '../use-report';
import useSubject from '../use-subject';
import useCurrentAccount from '../use-current-account';

export default function useConversationsReport() {
	const account = useCurrentAccount();
	const pubkey = account?.pubkey;

	// hardcode the report id to 'overview' so there is only ever one
	const report = useReport('CONVERSATIONS', pubkey ? 'conversations' : undefined, pubkey ? { pubkey } : undefined);

	return useSubject(report?.value);
}
