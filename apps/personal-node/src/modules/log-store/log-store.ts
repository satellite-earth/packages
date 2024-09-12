import { type Database as SQLDatabase } from 'better-sqlite3';
import { MigrationSet } from '@satellite-earth/core/sqlite';
import EventEmitter from 'events';
import { nanoid } from 'nanoid';
import { Debugger } from 'debug';

import { logger } from '../../logger.js';

type EventMap = {
	log: [LogEntry];
	clear: [string | undefined];
};

export type LogEntry = {
	id: string;
	service: string;
	timestamp: number;
	message: string;
};
export type DatabaseLogEntry = LogEntry & {
	id: number | bigint;
};

const migrations = new MigrationSet('log-store');

// version 1
migrations.addScript(1, async (db, log) => {
	db.prepare(
		`
		CREATE TABLE IF NOT EXISTS "logs" (
			"id" TEXT NOT NULL UNIQUE,
			"timestamp"	INTEGER NOT NULL,
			"service"	TEXT NOT NULL,
			"message"	TEXT NOT NULL,
			PRIMARY KEY("id")
		);
	`,
	).run();
	log('Created logs table');

	db.prepare('CREATE INDEX IF NOT EXISTS logs_service ON logs(service)');
	log('Created logs service index');
});

export default class LogStore extends EventEmitter<EventMap> {
	database: SQLDatabase;
	debug: Debugger;

	constructor(database: SQLDatabase) {
		super();
		this.database = database;
		this.debug = logger;
	}

	async setup() {
		return await migrations.run(this.database);
	}

	addEntry(service: string, timestamp: Date | number, message: string) {
		const unix = timestamp instanceof Date ? Math.round(timestamp.valueOf() / 1000) : timestamp;
		const entry = {
			id: nanoid(),
			service,
			timestamp: unix,
			message,
		};

		this.queue.push(entry);
		this.emit('log', entry);

		if (!this.running) this.write();
	}

	running = false;
	queue: LogEntry[] = [];
	private write() {
		if (this.running) return;
		this.running = true;

		const BATCH_SIZE = 5000;

		const inserted: (number | bigint)[] = [];
		const failed: LogEntry[] = [];

		this.database.transaction(() => {
			let i = 0;
			while (this.queue.length) {
				const entry = this.queue.shift()!;
				try {
					const { lastInsertRowid } = this.database
						.prepare<
							[string, string, number, string]
						>(`INSERT INTO "logs" (id, service, timestamp, message) VALUES (?, ?, ?, ?)`)
						.run(entry.id, entry.service, entry.timestamp, entry.message);

					inserted.push(lastInsertRowid);
				} catch (error) {
					failed.push(entry);
				}

				if (++i >= BATCH_SIZE) break;
			}
		})();

		for (const entry of failed) {
			// Don't know what to do here...
		}

		if (this.queue.length > 0) setTimeout(this.write.bind(this), 1000);
		else this.running = false;
	}

	getLogs(filter?: { service?: string; since?: number; until?: number; limit?: number }) {
		const conditions: string[] = [];
		const parameters: (string | number)[] = [];

		let sql = `SELECT * FROM logs`;

		if (filter?.service) {
			conditions.push(`service LIKE CONCAT(?,'%')`);
			parameters.push(filter?.service);
		}
		if (filter?.since) {
			conditions.push('timestamp>=?');
			parameters.push(filter?.since);
		}
		if (filter?.until) {
			conditions.push('timestamp<=?');
			parameters.push(filter?.until);
		}
		if (conditions.length > 0) sql += ` WHERE ${conditions.join(' AND ')}`;

		if (filter?.limit) {
			sql += ' LIMIT ?';
			parameters.push(filter.limit);
		}
		return this.database.prepare<any[], DatabaseLogEntry>(sql).all(...parameters);
	}

	clearLogs(filter?: { service?: string; since?: number; until?: number }) {
		const conditions: string[] = [];
		const parameters: (string | number)[] = [];

		let sql = `DELETE FROM logs`;

		if (filter?.service) {
			conditions.push('service=?');
			parameters.push(filter?.service);
		}
		if (filter?.since) {
			conditions.push('timestamp>=?');
			parameters.push(filter?.since);
		}
		if (filter?.until) {
			conditions.push('timestamp<=?');
			parameters.push(filter?.until);
		}
		if (conditions.length > 0) sql += ` WHERE ${conditions.join(' AND ')}`;

		this.database.prepare<any[], DatabaseLogEntry>(sql).run(...parameters);
		this.emit('clear', filter?.service);
	}
}
