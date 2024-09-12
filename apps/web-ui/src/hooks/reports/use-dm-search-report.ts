import useReport from '../use-report';
import useSubject from '../use-subject';

export default function useDMSearchReport(
	query: string,
	filter?: { conversation?: [string, string]; order?: 'rank' | 'created_at' },
) {
	const enabled = query.length >= 3;

	const report = useReport(
		'DM_SEARCH',
		enabled ? `dn-search-${query}` : undefined,
		enabled ? { query, conversation: filter?.conversation, order: filter?.order } : undefined,
	);

	const messages = useSubject(report?.results);
	const conversations = useSubject(report?.conversations);

	return { messages, conversations };
}
