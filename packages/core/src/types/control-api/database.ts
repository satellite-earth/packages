export type DatabaseStats = {
	count: number;
	size?: number;
};
type DatabaseSubscribeAction = ['CONTROL', 'DATABASE', 'SUBSCRIBE'];
type DatabaseUnsubscribeAction = ['CONTROL', 'DATABASE', 'UNSUBSCRIBE'];
type DatabaseStatsAction = ['CONTROL', 'DATABASE', 'STATS'];
type DatabaseClearAction = ['CONTROL', 'DATABASE', 'CLEAR'];
type DatabaseExportAction = ['CONTROL', 'DATABASE', 'EXPORT'];

type DatabaseStatsResponse = ['CONTROL', 'DATABASE', 'STATS', DatabaseStats];

export type DatabaseMessage =
	| DatabaseSubscribeAction
	| DatabaseUnsubscribeAction
	| DatabaseStatsAction
	| DatabaseClearAction
	| DatabaseExportAction;
export type DatabaseResponse = DatabaseStatsResponse;
