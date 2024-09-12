import { Database } from 'better-sqlite3';
import { Filter, NostrEvent, kinds } from 'nostr-tools';
import EventEmitter from 'events';

import { mapParams } from '../helpers/sql.js';
import { IEventStore } from './interface.js';
import { logger } from '../logger.js';
import { MigrationSet } from '../sqlite/migrations.js';

const isFilterKeyIndexableTag = (key: string) => {
	return key[0] === '#' && key.length === 2;
};
const isFilterKeyIndexableAndTag = (key: string) => {
	return key[0] === '&' && key.length === 2;
};

export type EventRow = {
	id: string;
	kind: number;
	pubkey: string;
	content: string;
	tags: string;
	created_at: number;
	sig: string;
};

export function parseEventRow(row: EventRow): NostrEvent {
	return { ...row, tags: JSON.parse(row.tags) };
}

// search behavior
const SEARCHABLE_TAGS = ['title', 'description', 'about', 'summary', 'alt'];
const SEARCHABLE_KIND_BLACKLIST = [kinds.EncryptedDirectMessage];
const SEARCHABLE_CONTENT_FORMATTERS: Record<number, (content: string) => string> = {
	[kinds.Metadata]: (content) => {
		const SEARCHABLE_PROFILE_FIELDS = [
			'name',
			'display_name',
			'about',
			'nip05',
			'lud16',
			'website',
			// Deprecated fields
			'displayName',
			'username',
		];
		try {
			const lines: string[] = [];
			const json = JSON.parse(content);

			for (const field of SEARCHABLE_PROFILE_FIELDS) {
				if (json[field]) lines.push(json[field]);
			}

			return lines.join('\n');
		} catch (error) {
			return content;
		}
	},
};

function convertEventToSearchRow(event: NostrEvent) {
	const tags = event.tags
		.filter((t) => SEARCHABLE_TAGS.includes(t[0]))
		.map((t) => t[1])
		.join(' ');

	const content = SEARCHABLE_CONTENT_FORMATTERS[event.kind]
		? SEARCHABLE_CONTENT_FORMATTERS[event.kind](event.content)
		: event.content;

	return { id: event.id, content, tags };
}

const migrations = new MigrationSet('event-store');

// Version 1
migrations.addScript(1, async (db, log) => {
	// Create events table
	db.prepare(
		`
		CREATE TABLE IF NOT EXISTS events (
			id TEXT(64) PRIMARY KEY,
			created_at INTEGER,
			pubkey TEXT(64),
			sig TEXT(128),
			kind INTEGER,
			content TEXT,
			tags TEXT
		)
		`,
	).run();

	log('Setup events');

	// Create tags table
	db.prepare(
		`
		CREATE TABLE IF NOT EXISTS tags (
			i INTEGER PRIMARY KEY AUTOINCREMENT,
			e TEXT(64) REFERENCES events(id),
			t TEXT(1),
			v TEXT
		)
		`,
	).run();

	log('Setup tags table');

	// Create indices
	const indices = [
		db.prepare('CREATE INDEX IF NOT EXISTS events_created_at ON events(created_at)'),
		db.prepare('CREATE INDEX IF NOT EXISTS events_pubkey ON events(pubkey)'),
		db.prepare('CREATE INDEX IF NOT EXISTS events_kind ON events(kind)'),
		db.prepare('CREATE INDEX IF NOT EXISTS tags_e ON tags(e)'),
		db.prepare('CREATE INDEX IF NOT EXISTS tags_t ON tags(t)'),
		db.prepare('CREATE INDEX IF NOT EXISTS tags_v ON tags(v)'),
	];

	indices.forEach((statement) => statement.run());

	log(`Setup ${indices.length} indices`);
});

// Version 2, search table
migrations.addScript(2, async (db, log) => {
	db.prepare(
		`CREATE VIRTUAL TABLE IF NOT EXISTS events_fts USING fts5(id UNINDEXED, content, tags, tokenize='trigram')`,
	).run();
	log('Created event search table');

	const rows = db
		.prepare<any[], EventRow>(`SELECT * FROM events WHERE kind NOT IN ${mapParams(SEARCHABLE_KIND_BLACKLIST)}`)
		.all(SEARCHABLE_KIND_BLACKLIST);

	// insert search content into table
	let changes = 0;
	for (const row of rows) {
		const search = convertEventToSearchRow(parseEventRow(row));

		const result = db
			.prepare<[string, string, string]>(`INSERT OR REPLACE INTO events_fts (id, content, tags) VALUES (?, ?, ?)`)
			.run(search.id, search.content, search.tags);

		changes += result.changes;
	}
	log(`Inserted ${changes} events into search table`);
});

type EventMap = {
	'event:inserted': [NostrEvent];
	'event:removed': [string];
};

export class SQLiteEventStore extends EventEmitter<EventMap> implements IEventStore {
	db: Database;
	log = logger.extend('sqlite-event-store');

	preserveEphemeral = false;
	preserveReplaceable = false;

	constructor(db: Database) {
		super();
		this.db = db;
	}

	setup() {
		return migrations.run(this.db);
	}

	addEvent(event: NostrEvent) {
		// Don't store ephemeral events in db,
		// just return the event directly
		if (!this.preserveEphemeral && kinds.isEphemeralKind(event.kind)) return false;

		const inserted = this.db.transaction(() => {
			// TODO: Check if event is replaceable and if its newer
			// before inserting it into the database

			const insert = this.db
				.prepare(
					`
					INSERT OR IGNORE INTO events (id, created_at, pubkey, sig, kind, content, tags)
					VALUES (?, ?, ?, ?, ?, ?, ?)
				`,
				)
				.run([
					event.id,
					event.created_at,
					event.pubkey,
					event.sig,
					event.kind,
					event.content,
					JSON.stringify(event.tags),
				]);

			// If event inserted, index tags, insert search
			if (insert.changes) {
				this.insertEventTags(event);

				// Remove older replaceable events and all their associated tags
				if (this.preserveReplaceable === false) {
					let older: { id: string; created_at: number }[] = [];

					if (kinds.isReplaceableKind(event.kind)) {
						// Normal replaceable event
						older = this.db
							.prepare<[number, string], { id: string; created_at: number }>(
								`
								SELECT id, created_at FROM events WHERE kind = ? AND pubkey = ?
								`,
							)
							.all(event.kind, event.pubkey);
					} else if (kinds.isParameterizedReplaceableKind(event.kind)) {
						// Parameterized Replaceable
						const d = event.tags.find((t) => t[0] === 'd')?.[1];

						if (d) {
							older = this.db
								.prepare<[number, string, 'd', string], { id: string; created_at: number }>(
									`
									SELECT events.id, events.created_at FROM events
									INNER JOIN tags ON events.id = tags.e
									WHERE kind = ? AND pubkey = ? AND tags.t = ? AND tags.v = ?
								`,
								)
								.all(event.kind, event.pubkey, 'd', d);
						}
					}

					// If found other events that may need to be replaced,
					// sort the events according to timestamp descending,
					// falling back to id lexical order ascending as per
					// NIP-01. Remove all non-most-recent events and tags.
					if (older.length > 1) {
						const removeIds = older
							.sort((a, b) => {
								return a.created_at === b.created_at ? a.id.localeCompare(b.id) : b.created_at - a.created_at;
							})
							.slice(1)
							.map((item) => item.id);

						if (!removeIds.includes(event.id)) this.log('Removed', removeIds.length, 'old replaceable events');

						this.removeEvents(removeIds);

						// If the event that was just inserted was one of
						// the events that was removed, return null so to
						// indicate that the event was in effect *not*
						// upserted and thus, if using the DB for a nostr
						// relay, does not need to be pushed to clients
						if (removeIds.indexOf(event.id) !== -1) return false;
					}
				}
			}

			return insert.changes > 0;
		})();

		if (inserted) {
			this.insertEventIntoSearch(event);
			this.emit('event:inserted', event);
		}

		return inserted;
	}

	private insertEventTags(event: NostrEvent) {
		for (let tag of event.tags) {
			if (tag[0].length === 1) {
				this.db.prepare(`INSERT INTO tags (e, t, v) VALUES (?, ?, ?)`).run(event.id, tag[0], tag[1]);
			}
		}
	}

	private insertEventIntoSearch(event: NostrEvent) {
		const search = convertEventToSearchRow(event);

		return this.db
			.prepare<[string, string, string]>(`INSERT OR REPLACE INTO events_fts (id, content, tags) VALUES (?, ?, ?)`)
			.run(search.id, search.content, search.tags);
	}

	removeEvents(ids: string[]) {
		const results = this.db.transaction(() => {
			this.db.prepare(`DELETE FROM tags WHERE e IN ${mapParams(ids)}`).run(...ids);
			this.db.prepare(`DELETE FROM events_fts WHERE id IN ${mapParams(ids)}`).run(...ids);

			return this.db.prepare(`DELETE FROM events WHERE events.id IN ${mapParams(ids)}`).run(...ids);
		})();

		if (results.changes > 0) {
			for (const id of ids) {
				this.emit('event:removed', id);
			}
		}
	}

	removeEvent(id: string) {
		const results = this.db.transaction(() => {
			this.db.prepare(`DELETE FROM tags WHERE e = ?`).run(id);
			this.db.prepare(`DELETE FROM events_fts WHERE id = ?`).run(id);

			return this.db.prepare(`DELETE FROM events WHERE events.id = ?`).run(id);
		})();

		if (results.changes > 0) this.emit('event:removed', id);

		return results.changes > 0;
	}

	buildConditionsForFilters(filter: Filter) {
		const joins: string[] = [];
		const conditions: string[] = [];
		const parameters: (string | number)[] = [];
		const groupBy: string[] = [];
		const having: string[] = [];

		// get AND tag filters
		const andTagQueries = Object.keys(filter).filter(isFilterKeyIndexableAndTag);
		// get OR tag filters and remove any ones that appear in the AND
		const orTagQueries = Object.keys(filter)
			.filter(isFilterKeyIndexableTag)
			.filter((t) => !andTagQueries.includes(t));

		if (orTagQueries.length > 0) {
			joins.push('INNER JOIN tags as or_tags ON events.id = or_tags.e');
		}
		if (andTagQueries.length > 0) {
			joins.push('INNER JOIN tags as and_tags ON events.id = and_tags.e');
		}
		if (filter.search) {
			joins.push('INNER JOIN events_fts ON events_fts.id = events.id');

			conditions.push(`events_fts MATCH ?`);
			parameters.push('"' + filter.search.replace(/"/g, '""') + '"');
		}

		if (typeof filter.since === 'number') {
			conditions.push(`events.created_at >= ?`);
			parameters.push(filter.since);
		}

		if (typeof filter.until === 'number') {
			conditions.push(`events.created_at < ?`);
			parameters.push(filter.until);
		}

		if (filter.ids) {
			conditions.push(`events.id IN ${mapParams(filter.ids)}`);
			parameters.push(...filter.ids);
		}

		if (filter.kinds) {
			conditions.push(`events.kind IN ${mapParams(filter.kinds)}`);
			parameters.push(...filter.kinds);
		}

		if (filter.authors) {
			conditions.push(`events.pubkey IN ${mapParams(filter.authors)}`);
			parameters.push(...filter.authors);
		}

		// add AND tag filters
		for (const t of andTagQueries) {
			conditions.push(`and_tags.t = ?`);
			parameters.push(t.slice(1));

			// @ts-expect-error
			const v = filter[t] as string[];
			conditions.push(`and_tags.v IN ${mapParams(v)}`);
			parameters.push(...v);
		}

		// add OR tag filters
		for (let t of orTagQueries) {
			conditions.push(`or_tags.t = ?`);
			parameters.push(t.slice(1));

			// @ts-expect-error
			const v = filter[t] as string[];
			conditions.push(`or_tags.v IN ${mapParams(v)}`);
			parameters.push(...v);
		}

		// if there is an AND tag filter set GROUP BY so that HAVING can be used
		if (andTagQueries.length > 0) {
			groupBy.push('events.id');
			having.push('COUNT(and_tags.i) = ?');

			// @ts-expect-error
			parameters.push(andTagQueries.reduce((t, k) => t + (filter[k] as string[]).length, 0));
		}

		return { conditions, parameters, joins, groupBy, having };
	}

	protected buildSQLQueryForFilters(filters: Filter[], select = 'events.*') {
		let sql = `SELECT ${select} FROM events `;

		const orConditions: string[] = [];
		const parameters: any[] = [];
		const groupBy = new Set<string>();
		const having = new Set<string>();

		let joins = new Set<string>();
		for (const filter of filters) {
			const parts = this.buildConditionsForFilters(filter);

			if (parts.conditions.length > 0) {
				orConditions.push(`(${parts.conditions.join(' AND ')})`);
				parameters.push(...parts.parameters);

				for (const join of parts.joins) joins.add(join);
				for (const group of parts.groupBy) groupBy.add(group);
				for (const have of parts.having) having.add(have);
			}
		}

		sql += Array.from(joins).join(' ');

		if (orConditions.length > 0) {
			sql += ` WHERE ${orConditions.join(' OR ')}`;
		}

		if (groupBy.size > 0) {
			sql += ' GROUP BY ' + Array.from(groupBy).join(',');
		}
		if (having.size > 0) {
			sql += ' HAVING ' + Array.from(having).join(' AND ');
		}

		// @ts-expect-error
		const order = filters.find((f) => f.order)?.order;
		if (filters.some((f) => f.search) && (order === 'rank' || order === undefined)) {
			sql = sql + ' ORDER BY rank';
		} else {
			sql = sql + ' ORDER BY created_at DESC';
		}

		let minLimit = Infinity;
		for (const filter of filters) {
			if (filter.limit) minLimit = Math.min(minLimit, filter.limit);
		}
		if (minLimit !== Infinity) {
			sql += ' LIMIT ?';
			parameters.push(minLimit);
		}

		return { sql, parameters };
	}

	getEventsForFilters(filters: Filter[]) {
		const { sql, parameters } = this.buildSQLQueryForFilters(filters);

		return this.db.prepare<any[], EventRow>(sql).all(parameters).map(parseEventRow);
	}

	*iterateEventsForFilters(filters: Filter[]): IterableIterator<NostrEvent> {
		const { sql, parameters } = this.buildSQLQueryForFilters(filters);
		const iterator = this.db.prepare<any[], EventRow>(sql).iterate(parameters);

		while (true) {
			const { value: row, done } = iterator.next();
			if (done) break;

			yield parseEventRow(row);
		}
	}

	countEventsForFilters(filters: Filter[]) {
		const { sql, parameters } = this.buildSQLQueryForFilters(filters);

		const results = this.db.prepare(`SELECT COUNT(*) as count FROM ( ${sql} )`).get(parameters) as
			| { count: number }
			| undefined;
		return results?.count ?? 0;
	}
}
