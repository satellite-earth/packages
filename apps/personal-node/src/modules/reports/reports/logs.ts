import { ReportArguments } from '@satellite-earth/core/types/control-api/reports.js';

import { LogEntry } from '../../logs/log-store.js';
import Report from '../report.js';

/** WARNING: be careful of calling this.log in this class. it could trigger an infinite loop of logging */
export default class LogsReport extends Report<'LOGS'> {
	readonly type = 'LOGS';

	async setup() {
		const listener = (entry: LogEntry) => {
			if (!this.args?.service || entry.service === this.args.service) this.send(entry);
		};

		this.app.logStore.on('log', listener);
		return () => this.app.logStore.off('log', listener);
	}

	async execute(args: ReportArguments['LOGS']) {
		const logs = this.app.logStore.getLogs({ service: args.service, limit: 500 });
		for (const entry of logs) this.send(entry);
	}
}
