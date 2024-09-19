import { ReportArguments, ReportResults } from '@satellite-earth/core/types';
import { nanoid } from 'nanoid';

import PersonalNodeControlApi from './control-api';

export default class Report<T extends keyof ReportArguments> {
	id: string;
	args: ReportArguments[T];
	running = false;

	error: string | undefined;

	control: PersonalNodeControlApi;
	constructor(id: string = nanoid(), args: ReportArguments[T], control: PersonalNodeControlApi) {
		this.id = id;
		this.args = args;
		this.control = control;
	}

	// override
	// @ts-expect-error
	readonly type: T = 'unset';
	onFire(args: ReportArguments[T]) {}
	handleResult(result: ReportResults[T]) {}
	handleError(message: string) {
		this.error = message;
	}

	// public api
	fire() {
		this.onFire(this.args);
		// @ts-expect-error
		this.control.send(['CONTROL', 'REPORT', 'SUBSCRIBE', this.id, this.type, this.args]);
		this.running = true;
	}
	setArgs(args: ReportArguments[T]) {
		this.args = args;
	}
	close() {
		this.control.send(['CONTROL', 'REPORT', 'CLOSE', this.id]);
		this.running = false;
	}
}
