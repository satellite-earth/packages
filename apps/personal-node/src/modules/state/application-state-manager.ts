import { MigrationSet } from '@satellite-earth/core/sqlite';
import { Database } from 'better-sqlite3';

import { MutableState } from './mutable-state.js';

const migrations = new MigrationSet('application-state');

migrations.addScript(1, async (db, log) => {
	db.prepare(
		`
		CREATE TABLE "application_state" (
			"id"	TEXT NOT NULL,
			"state"	TEXT,
			PRIMARY KEY("id")
		);
	`,
	).run();

	log('Created application state table');
});

export default class ApplicationStateManager {
	private mutableState = new Map<string, MutableState<any>>();

	database: Database;
	constructor(database: Database) {
		this.database = database;
	}

	async setup() {
		await migrations.run(this.database);
	}

	async getMutableState<T extends object>(key: string, initialState: T) {
		const cached = this.mutableState.get(key);
		if (cached) return cached as MutableState<T>;

		const state = new MutableState<T>(this.database, key, initialState);
		await state.read();
		this.mutableState.set(key, state);
		return state;
	}

	async saveAll() {
		for (const [key, state] of this.mutableState) {
			await state.save();
		}
	}
}
