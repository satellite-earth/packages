import { Database } from 'better-sqlite3';
import { Filter, NostrEvent } from 'nostr-tools';
import { IEventStore, SQLiteEventStore } from '@satellite-earth/core';
import { logger } from '../logger.js';
import { MigrationSet } from '@satellite-earth/core/sqlite';

export function mapParams(params: any[]) {
	return `(${params.map(() => `?`).join(', ')})`;
}

const migrations = new MigrationSet('labeled-event-store');

// Version 1
migrations.addScript(1, async (db, log) => {
	db.prepare(
		`
		CREATE TABLE IF NOT EXISTS event_labels (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			event TEXT(64) REFERENCES events(id),
			label TEXT
		)
	`,
	).run();

	db.prepare('CREATE INDEX IF NOT EXISTS event_labels_label ON event_labels(label)').run();
	db.prepare('CREATE INDEX IF NOT EXISTS event_labels_event ON event_labels(event)').run();
});

/** An event store that is can only see a subset of events int the database */
export class LabeledEventStore extends SQLiteEventStore implements IEventStore {
	label: string;
	readAll = false;

	constructor(db: Database, label: string) {
		super(db);
		this.label = label;

		this.log = logger.extend(`event-store:` + label);
	}

	async setup() {
		await super.setup();
		await migrations.run(this.db);
	}

	override buildConditionsForFilters(filter: Filter) {
		const parts = super.buildConditionsForFilters(filter);

		if (!this.readAll) {
			parts.joins.push('INNER JOIN event_labels ON events.id = event_labels.event');
			parts.conditions.push('event_labels.label = ?');
			parts.parameters.push(this.label);
			return parts;
		}

		return parts;
	}

	addEvent(event: NostrEvent) {
		const inserted = super.addEvent(event);

		const hasLabel = !!this.db
			.prepare('SELECT * FROM event_labels WHERE event = ? AND label = ?')
			.get(event.id, this.label);
		if (!hasLabel) this.db.prepare(`INSERT INTO event_labels (event, label) VALUES (?, ?)`).run(event.id, this.label);

		return inserted;
	}

	removeEvents(ids: string[]) {
		this.db.prepare(`DELETE FROM event_labels WHERE event IN ${mapParams(ids)}`).run(...ids);
		return super.removeEvents(ids);
	}

	removeEvent(id: string) {
		this.db.prepare(`DELETE FROM event_labels WHERE event = ?`).run(id);
		return super.removeEvent(id);
	}
}
