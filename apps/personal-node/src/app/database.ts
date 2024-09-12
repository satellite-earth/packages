import EventEmitter from 'events';
import Database, { type Database as SQLDatabase } from 'better-sqlite3';
import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs';

import { USE_PREBUILT_SQLITE_BINDINGS } from '../env.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export type LocalDatabaseConfig = {
	directory: string;
	name: string;
	wal: boolean;
};

export default class LocalDatabase extends EventEmitter {
	config: LocalDatabaseConfig;
	path: { main: string; shm: string; wal: string };

	db: SQLDatabase;

	constructor(config: Partial<LocalDatabaseConfig>) {
		super();

		this.config = {
			directory: 'data',
			name: 'events',
			wal: true,
			...config,
		};

		this.path = {
			main: path.join(this.config.directory, `${this.config.name}.db`),
			shm: path.join(this.config.directory, `${this.config.name}.db-shm`),
			wal: path.join(this.config.directory, `${this.config.name}.db-wal`),
		};

		// Detect architecture to pass the correct native sqlite module
		this.db = new Database(this.path.main, {
			// Optionally use native bindings indicated by environment
			nativeBinding: USE_PREBUILT_SQLITE_BINDINGS
				? path.join(
						path.join(__dirname, '../../lib/bin'),
						`${process.arch === 'arm64' ? 'arm64' : 'x64'}/better_sqlite3.node`,
					)
				: undefined,
		});

		if (this.config.wal) this.db.pragma('journal_mode = WAL');
	}

	hasTable(table: string) {
		const result = this.db
			.prepare(`SELECT COUNT(*) as count FROM sqlite_master WHERE type='table' AND name=?`)
			.get([table]) as { count: number };
		return result.count > 0;
	}

	// Delete all events in the database
	/** @deprecated this should not be used */
	clear() {
		this.db.transaction(() => {
			this.db.prepare(`DELETE FROM tags`).run();
			if (this.hasTable('event_labels')) this.db.prepare(`DELETE FROM event_labels`).run();
			this.db.prepare(`DELETE FROM events`).run();
		})();
	}

	// Get number of events in the database
	/** @deprecated this should be moved to a report */
	count() {
		const result = this.db.prepare(`SELECT COUNT(*) AS events FROM events`).get() as { events: number };

		return result.events;
	}

	// Get total size of the database on disk
	size() {
		let sum;

		try {
			const statMain = fs.statSync(this.path.main).size;
			const statShm = this.config.wal ? fs.statSync(this.path.shm).size : 0;
			const statWal = this.config.wal ? fs.statSync(this.path.wal).size : 0;

			sum = statMain + statShm + statWal;
		} catch (err) {
			console.log(err);
		}

		return sum;
	}

	destroy() {
		this.removeAllListeners();
	}
}
