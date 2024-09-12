import Report from '../report.js';

export default class ServicesReport extends Report<'SERVICES'> {
	readonly type = 'SERVICES';

	async execute() {
		const services = this.app.database.db
			.prepare<[], { id: string }>(`SELECT service as id FROM logs GROUP BY service`)
			.all();
		for (const service of services) this.send(service);
	}
}
