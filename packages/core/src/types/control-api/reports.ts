import { ReportArguments, ReportResults } from '../reports/index.js';

// client -> server
export type ReportSubscribeMessage<T extends keyof ReportArguments> = [
	'CONTROL',
	'REPORT',
	'SUBSCRIBE',
	string,
	T,
	ReportArguments[T],
];
export type ReportCloseMessage = ['CONTROL', 'REPORT', 'CLOSE', string];

// server -> client
export type ReportResultMessage<T extends keyof ReportResults> = [
	'CONTROL',
	'REPORT',
	'RESULT',
	string,
	ReportResults[T],
];
export type ReportErrorMessage = ['CONTROL', 'REPORT', 'ERROR', string, string];

// control api types
export type ReportsMessage =
	| ReportSubscribeMessage<'OVERVIEW'>
	| ReportSubscribeMessage<'CONVERSATIONS'>
	| ReportCloseMessage;
export type ReportsResponse =
	| ReportResultMessage<'OVERVIEW'>
	| ReportResultMessage<'CONVERSATIONS'>
	| ReportErrorMessage;
