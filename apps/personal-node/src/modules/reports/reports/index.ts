import { ReportArguments } from '@satellite-earth/core/types';
import Report from '../report.js';

import OverviewReport from './overview.js';
import ConversationsReport from './conversations.js';
import LogsReport from './logs.js';
import ServicesReport from './services.js';
import DMSearchReport from './dm-search.js';
import ScrapperStatusReport from './scrapper-status.js';
import ReceiverStatusReport from './receiver-status.js';
import NetworkStatusReport from './network-status.js';
import NotificationChannelsReport from './notification-channels.js';
import EventsSummaryReport from './events-summary.js';

const REPORT_CLASSES: {
	[k in keyof ReportArguments]?: typeof Report<k>;
} = {
	OVERVIEW: OverviewReport,
	CONVERSATIONS: ConversationsReport,
	LOGS: LogsReport,
	SERVICES: ServicesReport,
	DM_SEARCH: DMSearchReport,
	SCRAPPER_STATUS: ScrapperStatusReport,
	RECEIVER_STATUS: ReceiverStatusReport,
	NETWORK_STATUS: NetworkStatusReport,
	NOTIFICATION_CHANNELS: NotificationChannelsReport,
	EVENTS_SUMMARY: EventsSummaryReport,
};

export default REPORT_CLASSES;
