import { WebSocket } from 'ws';
import {
	ReportArguments,
	ReportErrorMessage,
	ReportResultMessage,
	ReportResults,
} from '@satellite-earth/core/types/control-api/reports.js';

import type App from '../../app/index.js';
import { logger } from '../../logger.js';

type f = () => void;

export default class Report<T extends keyof ReportResults> {
	id: string;
	// @ts-expect-error
	readonly type: T = '';
	socket: WebSocket | NodeJS.Process;
	app: App;
	running = false;
	log = logger.extend('Report');
	args?: ReportArguments[T];

	private setupTeardown?: void | f;

	constructor(id: string, app: App, socket: WebSocket | NodeJS.Process) {
		this.id = id;
		this.socket = socket;
		this.app = app;

		this.log = logger.extend('Report:' + this.type);
	}

	private sendError(message: string) {
		this.socket.send?.(JSON.stringify(['CONTROL', 'REPORT', 'ERROR', this.id, message] satisfies ReportErrorMessage));
	}

	// override when extending
	/** This method is run only once when the report starts */
	async setup(args: ReportArguments[T]): Promise<void | f> {}
	/** this method is run every time the client sends new arguments */
	async execute(args: ReportArguments[T]) {}
	/** this method is run when the report is closed */
	cleanup() {}

	// private methods
	protected send(result: ReportResults[T]) {
		this.socket.send?.(
			JSON.stringify(['CONTROL', 'REPORT', 'RESULT', this.id, result] satisfies ReportResultMessage<T>),
		);
	}

	// public api
	async run(args: ReportArguments[T]) {
		try {
			this.args = args;
			if (this.running === false) {
				// hack to make sure the .log is extended correctly
				this.log = logger.extend('Report:' + this.type);

				this.setupTeardown = await this.setup(args);
			}

			this.log(`Executing with args`, JSON.stringify(args));
			await this.execute(args);
			this.running = true;
		} catch (error) {
			if (error instanceof Error) this.sendError(error.message);
			else this.sendError('Unknown server error');
		}
	}
	close() {
		this.setupTeardown?.();
		this.cleanup();
		this.running = false;
	}
}
