import { Database } from 'better-sqlite3';

type ScriptFunction = (database: Database, log: (message: string) => void) => Promise<void>;
type MigrationScript = { version: number; migrate: ScriptFunction };

function unixNow() {
	return Math.round(Date.now() / 1000);
}

class MigrationSet {
	scripts: MigrationScript[] = [];

	name: string;
	database?: Database;
	setupMigrationTables = true;

	constructor(name: string, database?: Database) {
		this.database = database;
		this.name = name;
	}

	private ensureMigrations(database: Database | undefined = this.database) {
		if (!database) throw new Error('database required');

		database
			.prepare(
				`
			CREATE TABLE IF NOT EXISTS "migrations" (
				"id"	INTEGER NOT NULL,
				"name"	TEXT NOT NULL,
				"version"	INTEGER NOT NULL,
				"date"	INTEGER NOT NULL,
				PRIMARY KEY("id" AUTOINCREMENT)
			);
			`,
			)
			.run();
		database
			.prepare(
				`
			CREATE TABLE IF NOT EXISTS "migration_logs" (
				"id"	INTEGER NOT NULL,
				"migration"	INTEGER NOT NULL,
				"message"	TEXT NOT NULL,
				FOREIGN KEY("migration") REFERENCES "migrations",
				PRIMARY KEY("id" AUTOINCREMENT)
			);
			`,
			)
			.run();
	}

	addScript(version: number, migrate: ScriptFunction) {
		this.scripts.push({ version, migrate });
	}

	async run(database: Database | undefined = this.database) {
		if (!database) throw new Error('database required');

		// ensure migration tables are setup
		await this.ensureMigrations(database);

		const prev = database
			.prepare<[string], { name: string; version: number }>(`SELECT * FROM migrations WHERE name=?`)
			.all(this.name);
		const lastVersion = prev.reduce((v, m) => Math.max(m.version, v), 0);

		const sorted = Array.from(this.scripts).sort((a, b) => a.version - b.version);

		let version = lastVersion;
		for (const script of sorted) {
			if (version < script.version) {
				let logs: string[] = [];
				await database.transaction(() => {
					return script.migrate(database, (message) => logs.push(message));
				})();

				version = script.version;

				// save the migration
				database.transaction(() => {
					const result = database
						.prepare<[string, number, number]>(`INSERT INTO migrations (name, version, date) VALUES (?, ?, ?)`)
						.run(this.name, script.version, unixNow());

					const insertLog = database.prepare<[number | BigInt, string]>(
						`INSERT INTO migration_logs (migration, message) VALUES (?, ?)`,
					);

					for (const message of logs) {
						insertLog.run(result.lastInsertRowid, message);
					}
				})();
			}
		}
	}
}

export { MigrationSet };
