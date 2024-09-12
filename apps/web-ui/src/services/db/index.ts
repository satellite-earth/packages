import { openDB, deleteDB } from 'idb';

import { SchemaV1 } from './schema';
import { logger } from '../../helpers/debug';

const log = logger.extend('Database');

const dbName = 'community-storage';
const version = 1;
const db = await openDB<SchemaV1>(dbName, version, {
	upgrade(db, oldVersion, _newVersion, _transaction, _event) {
		if (oldVersion < 1) {
			db.createObjectStore('settings');
			db.createObjectStore('accounts', { keyPath: 'pubkey' });

			const dnsIdentifiers = db.createObjectStore('dnsIdentifiers');
			dnsIdentifiers.createIndex('pubkey', 'pubkey');
			dnsIdentifiers.createIndex('name', 'name');
			dnsIdentifiers.createIndex('domain', 'domain');
			dnsIdentifiers.createIndex('updated', 'updated');
		}
	},
});

log('Open');

export async function clearCacheData() {
	log('Clearing nostr-idb');
	window.location.reload();
}

export async function deleteDatabase() {
	log('Closing');
	db.close();
	log('Deleting');
	await deleteDB(dbName);
	window.location.reload();
}

if (import.meta.env.DEV) {
	// @ts-ignore
	window.db = db;
}

export default db;
