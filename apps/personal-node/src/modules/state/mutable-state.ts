import { EventEmitter } from 'events';
import { Database } from 'better-sqlite3';
import _throttle from 'lodash.throttle';
import { Debugger } from 'debug';

import { logger } from '../../logger.js';

type EventMap<T> = {
	/** fires when file is loaded */
	loaded: [T];
	/** fires when a field is set */
	changed: [T, string, any];
	/** fires when state is loaded or changed */
	updated: [T];
	saved: [T];
};

export class MutableState<T extends object> extends EventEmitter<EventMap<T>> {
	state?: T;
	log: Debugger;

	private _proxy?: T;

	/** A Proxy object that will automatically save when mutated */
	get proxy() {
		if (!this._proxy) throw new Error('Cant access state before initialized');
		return this._proxy;
	}

	key: string;
	database: Database;

	constructor(database: Database, key: string, initialState: T) {
		super();
		this.state = initialState;
		this.key = key;
		this.database = database;
		this.log = logger.extend(`State:` + key);
		this.createProxy();
	}

	private createProxy() {
		if (!this.state) return;

		return (this._proxy = new Proxy(this.state, {
			get(target, prop, receiver) {
				return Reflect.get(target, prop, receiver);
			},
			set: (target, p, newValue, receiver) => {
				Reflect.set(target, p, newValue, receiver);
				this.emit('changed', target as T, String(p), newValue);
				this.emit('updated', target as T);
				this.throttleSave();
				return newValue;
			},
		}));
	}

	private throttleSave = _throttle(this.save.bind(this), 30_000);

	async read() {
		const row = await this.database
			.prepare<[string], { id: string; state: string }>(`SELECT id, state FROM application_state WHERE id=?`)
			.get(this.key);

		const state: T | undefined = row ? (JSON.parse(row.state) as T) : undefined;
		if (state && this.state) {
			Object.assign(this.state, state);
			this.log('Loaded');
		}

		if (!this.state) throw new Error(`Missing initial state for ${this.key}`);

		this.createProxy();

		if (this.state) {
			this.emit('loaded', this.state);
			this.emit('updated', this.state);
		}
	}
	async save() {
		if (!this.state) return;

		await this.database
			.prepare<[string, string]>(`INSERT OR REPLACE INTO application_state (id, state) VALUES (?, ?)`)
			.run(this.key, JSON.stringify(this.state));

		this.log('Saved');
		this.emit('saved', this.state);
	}
}
