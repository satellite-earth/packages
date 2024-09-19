import { WebSocket } from 'ws';
import { ReportArguments } from '@satellite-earth/core/types';
import { ReportsMessage } from '@satellite-earth/core/types/control-api/reports.js';

import type App from '../../app/index.js';
import { type ControlMessageHandler } from './control-api.js';
import Report from '../reports/report.js';
import { logger } from '../../logger.js';
import REPORT_CLASSES from '../reports/reports/index.js';

/** handles ['CONTROL', 'REPORT', ...] messages */
export default class ReportActions implements ControlMessageHandler {
	app: App;
	name = 'REPORT';
	log = logger.extend('ReportActions');

	types: {
		[k in keyof ReportArguments]?: typeof Report<k>;
	} = REPORT_CLASSES;

	private reports = new Map<WebSocket | NodeJS.Process, Map<string, Report<any>>>();

	constructor(app: App) {
		this.app = app;
	}

	private getReportsForSocket(socket: WebSocket | NodeJS.Process) {
		let map = this.reports.get(socket);
		if (map) return map;
		map = new Map();
		this.reports.set(socket, map);
		return map;
	}

	handleDisconnect(ws: WebSocket): void {
		// close all reports for socket on disconnect
		const reports = this.reports.get(ws);

		if (reports) {
			for (const [id, report] of reports) report.close();

			if (reports.size) this.log(`Closed ${reports.size} reports for disconnected socket`);
			this.reports.delete(ws);
		}
	}

	// TODO: maybe move some of this logic out to a manager class so the control action class can be simpler
	async handleMessage(sock: WebSocket | NodeJS.Process, message: ReportsMessage) {
		const method = message[2];
		switch (method) {
			case 'SUBSCRIBE': {
				const reports = this.getReportsForSocket(sock);
				const id = message[3];
				const type = message[4];
				const args = message[5];

				let report = reports.get(id) as Report<typeof type> | undefined;
				if (!report) {
					const ReportClass = this.types[type];
					if (!ReportClass) throw new Error('Missing class for report type: ' + type);

					this.log(`Creating ${type} ${id} report with args`, JSON.stringify(args));

					report = new ReportClass(id, this.app, sock);
					reports.set(id, report);
				}

				await report.run(args);
				return true;
			}
			case 'CLOSE': {
				const reports = this.getReportsForSocket(sock);
				const id = message[3];
				const report = reports.get(id);
				if (report) {
					await report.close();
					reports.delete(id);
				}
				return true;
			}
			default:
				return false;
		}
	}

	cleanup() {
		for (const [sock, reports] of this.reports) {
			for (const [id, report] of reports) {
				report.close();
			}
		}
	}
}
