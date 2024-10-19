import { ControlMessage, ControlResponse } from '@satellite-earth/core/types/control-api/index.d.ts';
import { PrivateNodeConfig } from '@satellite-earth/core/types/private-node-config.js';
import { DatabaseStats } from '@satellite-earth/core/types/control-api/database.js';
import EventEmitter from 'eventemitter3';

import Subject from './subject';
import PersonalNode from './personal-node';

type EventMap = {
	message: [ControlResponse];
	authenticated: [boolean];
};

export default class PersonalNodeControlApi extends EventEmitter<EventMap> {
	node: PersonalNode;

	config = new Subject<PrivateNodeConfig>();
	/** @deprecated this should be a report */
	databaseStats = new Subject<DatabaseStats>();
	vapidKey = new Subject<string>();

	constructor(node: PersonalNode) {
		super();
		this.node = node;

		this.node.authenticated.subscribe((authenticated) => {
			this.emit('authenticated', authenticated);
			if (authenticated) {
				this.node.sendControlMessage(['CONTROL', 'CONFIG', 'SUBSCRIBE']);
				this.node.sendControlMessage(['CONTROL', 'DATABASE', 'SUBSCRIBE']);
				this.node.sendControlMessage(['CONTROL', 'REMOTE-AUTH', 'SUBSCRIBE']);
			}
		});

		this.node.onControlResponse.subscribe(this.handleControlResponse.bind(this));
	}

	handleControlResponse(response: ControlResponse) {
		this.emit('message', response);

		switch (response[1]) {
			case 'CONFIG':
				if (response[2] === 'CHANGED') this.config.next(response[3]);
				break;

			case 'DATABASE':
				if (response[2] === 'STATS') this.databaseStats.next(response[3]);
				break;

			case 'NOTIFICATIONS':
				if (response[2] === 'VAPID-KEY') this.vapidKey.next(response[3]);
				break;

			default:
				break;
		}
	}

	send(message: ControlMessage) {
		if (this.node.connected) this.node.send(JSON.stringify(message));
	}

	async setConfigField<T extends keyof PrivateNodeConfig>(field: T, value: PrivateNodeConfig[T]) {
		if (this.config.value === undefined) throw new Error('Config not synced');

		await this.send(['CONTROL', 'CONFIG', 'SET', field, value]);

		return new Promise<PrivateNodeConfig>((res) => {
			const sub = this.config.subscribe((config) => {
				res(config);
				sub.unsubscribe();
			});
		});
	}
}
