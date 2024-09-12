import { mapParams } from '@satellite-earth/core/helpers/sql.js';
import { MigrationSet } from '@satellite-earth/core/sqlite';
import { type Database } from 'better-sqlite3';
import { EventEmitter } from 'events';

import { logger } from '../../logger.js';
import { EventRow, parseEventRow } from '@satellite-earth/core/sqlite-event-store';
import { NostrEvent } from 'nostr-tools';

const migrations = new MigrationSet('decryption-cache');

// Version 1
migrations.addScript(1, async (db, log) => {
	db.prepare(
		`
		CREATE TABLE "decryption_cache" (
			"event"	TEXT(64) NOT NULL,
			"content"	TEXT NOT NULL,
			PRIMARY KEY("event")
		);
	`,
	).run();
});

// Version 2, search
migrations.addScript(2, async (db, log) => {
	// create external Content fts5 table
	db.prepare(
		`CREATE VIRTUAL TABLE IF NOT EXISTS decryption_cache_fts USING fts5(content, content='decryption_cache', tokenize='trigram')`,
	).run();
	log(`Created decryption cache search table`);

	// create triggers to sync table
	db.prepare(
		`
		CREATE TRIGGER IF NOT EXISTS decryption_cache_ai AFTER INSERT ON decryption_cache BEGIN
			INSERT INTO decryption_cache_fts(rowid, content) VALUES (NEW.rowid, NEW.content);
		END;
		`,
	).run();
	db.prepare(
		`
		CREATE TRIGGER IF NOT EXISTS decryption_cache_ad AFTER DELETE ON decryption_cache BEGIN
  		INSERT INTO decryption_cache_ai(decryption_cache_ai, rowid, content) VALUES('delete', OLD.rowid, OLD.content);
		END;
		`,
	).run();

	// populate table
	const inserted = db
		.prepare(`INSERT INTO decryption_cache_fts (rowid, content) SELECT rowid, content FROM decryption_cache`)
		.run();
	log(`Indexed ${inserted.changes} decrypted events in search table`);
});

type EventMap = {
	cache: [string, string];
};

export default class DecryptionCache extends EventEmitter<EventMap> {
	database: Database;
	log = logger.extend('DecryptionCache');

	constructor(database: Database) {
		super();
		this.database = database;
	}

	setup() {
		return migrations.run(this.database);
	}

	/** cache the decrypted content of an event */
	addEventContent(id: string, plaintext: string) {
		const result = this.database
			.prepare<[string, string]>(`INSERT INTO decryption_cache (event, content) VALUES (?, ?)`)
			.run(id, plaintext);

		if (result.changes > 0) {
			this.log(`Saved content for ${id}`);

			this.emit('cache', id, plaintext);
		}
	}

	/** remove all cached content relating to a pubkey */
	clearPubkey(pubkey: string) {
		// this.database.prepare<string>(`DELETE FROM decryption_cache INNER JOIN events ON event=events.id`)
	}

	/** clear all cached content */
	clearAll() {
		this.database.prepare(`DELETE FROM decryption_cache`).run();
	}

	async search(
		search: string,
		filter?: { conversation?: [string, string]; order?: 'rank' | 'created_at' },
	): Promise<{ event: NostrEvent; plaintext: string }[]> {
		const params: any[] = [];
		const andConditions: string[] = [];

		let sql = `SELECT events.*, decryption_cache.content as plaintext FROM decryption_cache_fts
				INNER JOIN decryption_cache ON decryption_cache_fts.rowid = decryption_cache.rowid
				INNER JOIN events ON decryption_cache.event = events.id`;

		andConditions.push('decryption_cache_fts MATCH ?');
		params.push(search);

		// filter down by authors
		if (filter?.conversation) {
			sql += `\nINNER JOIN tags ON tag.e = events.id AND tags.t = 'p'`;
			andConditions.push(`(tags.v = ? AND events.pubkey = ?) OR (tags.v = ? AND events.pubkey = ?)`);
			params.push(...filter.conversation, ...Array.from(filter.conversation).reverse());
		}

		if (andConditions.length > 0) {
			sql += ` WHERE ${andConditions.join(' AND ')}`;
		}

		switch (filter?.order) {
			case 'rank':
				sql += ' ORDER BY rank';
				break;

			case 'created_at':
			default:
				sql += ' ORDER BY events.created_at DESC';
				break;
		}

		return this.database
			.prepare<any[], EventRow & { plaintext: string }>(sql)
			.all(...params)
			.map((row) => ({ event: parseEventRow(row), plaintext: row.plaintext }));
	}

	async getEventContent(id: string) {
		const result = this.database
			.prepare<[string], { event: string; content: string }>(`SELECT * FROM decryption_cache WHERE event=?`)
			.get(id);

		return result?.content;
	}
	async getEventsContent(ids: string[]) {
		return this.database
			.prepare<
				string[],
				{ event: string; content: string }
			>(`SELECT * FROM decryption_cache WHERE event IN ${mapParams(ids)}`)
			.all(...ids);
	}
}
