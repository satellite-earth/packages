import { BlossomClient, Signer } from 'blossom-client-sdk';
import { IBlobMetadataStore, IBlobStorage } from 'blossom-server-sdk';
import { NostrEvent } from 'nostr-tools';
import { Debugger } from 'debug';
import { PassThrough, Readable } from 'node:stream';
import crypto from 'node:crypto';
import path from 'node:path';
import fs from 'node:fs';
import os from 'node:os';

import { logger } from '../logger.js';
import { readStreamFromURL } from '@satellite-earth/core';

function compressHex(pubkey: string) {
	if (pubkey.length > 16) return pubkey.slice(0, 7);
	return pubkey;
}

function waitForEnd(stream: Readable) {
	return new Promise<void>((res) => stream.on('end', () => res()));
}

export class BlobDownloader {
	storage: IBlobStorage;
	metadata: IBlobMetadataStore;
	downloadDir: string;

	log: Debugger = logger.extend('blob-downloader');

	// queue of blobs to download
	queue: {
		sha256: string;
		servers?: string[];
		urls?: string[];
		type?: string;
		size?: number;
		owners?: string[];
	}[] = [];

	constructor(storage: IBlobStorage, metadata: IBlobMetadataStore) {
		this.storage = storage;
		this.metadata = metadata;
		this.downloadDir = fs.mkdtempSync(path.join(os.tmpdir(), 'satellite-'));
		this.log('Using', this.downloadDir, 'download directory');
	}

	async downloadNext() {
		if (this.queue.length === 0) return;
		const queued = this.queue.shift();
		if (!queued) return;

		let { sha256, servers, urls, owners, type, size } = queued;

		if ((servers || urls) && (await this.storage.hasBlob(queued.sha256)) === false) {
			let downloadURLs: string[] = [];
			if (servers) {
				for (const server of servers) downloadURLs.push(new URL(sha256, server).toString());
			}
			if (urls) {
				for (const url of urls) downloadURLs.push(url);
			}

			this.log('Downloading blob', compressHex(sha256), 'from', downloadURLs.length, 'urls');

			for (const url of downloadURLs) {
				const res = await readStreamFromURL(url);
				type = type || res.headers['content-type'];

				const download = path.join(this.downloadDir, sha256);
				const write = fs.createWriteStream(download);

				const pass = new PassThrough();
				const hash = crypto.createHash('sha256').setEncoding('hex');

				res.pipe(pass).pipe(hash);
				res.pipe(write);

				await waitForEnd(res);
				hash.end();

				const verifyHash = hash.read() as string;

				if (verifyHash !== sha256) {
					this.log('Got a bad download for', compressHex(sha256));
					// fs.rmSync(download);
					continue;
				}

				await this.storage.writeBlob(sha256, fs.createReadStream(download), type);
				fs.rmSync(download);

				type = type || (await this.storage.getBlobType(sha256));
				size = size || (await this.storage.getBlobSize(sha256));

				if ((await this.metadata.hasBlob(sha256)) === false) {
					await this.metadata.addBlob({
						sha256,
						size,
						type,
						uploaded: Math.floor(Date.now()),
					});
				}

				break;
			}
		}

		if (owners) {
			for (const owner of owners) {
				if ((await this.metadata.hasOwner(sha256, owner)) === false) {
					this.log('Adding owner', compressHex(owner), 'to', compressHex(sha256));
					await this.metadata.addOwner(sha256, owner);
				}
			}
		}
	}

	addToQueue(
		sha256: string,
		metadata: {
			type?: string;
			size?: number;
			owners?: string[];
			servers?: string[];
			urls?: string[];
		} = {},
		override = false,
	) {
		let added = false;
		let existing = this.queue.find((q) => q.sha256 === sha256);
		if (!existing) {
			existing = { sha256 };
			this.queue.push(existing);
			added = true;
		}

		if (metadata.type && (!existing.type || override)) existing.type = metadata.type;

		if (metadata.size && (!existing.size || override)) existing.size = metadata.size;

		if (metadata.servers) {
			if (existing.servers) existing.servers = [...existing.servers, ...metadata.servers];
			else existing.servers = metadata.servers;
		}
		if (metadata.urls) {
			if (existing.urls) existing.urls = [...existing.urls, ...metadata.urls];
			else existing.urls = metadata.urls;
		}

		if (metadata.owners) {
			if (existing.owners) existing.owners = [...existing.owners, ...metadata.owners];
			else existing.owners = metadata.owners;
		}

		return added;
	}

	async queueBlobsFromPubkey(pubkey: string, servers: string[], signer?: Signer) {
		this.log('Adding blobs from pubkey', compressHex(pubkey));
		const auth = signer ? await BlossomClient.getListAuth(signer, 'Backup Blobs') : undefined;

		for (const server of servers) {
			try {
				const blobs = await BlossomClient.listBlobs(server, pubkey, {}, auth);
				for (const blob of blobs) {
					this.addToQueue(blob.sha256, {
						size: blob.size,
						type: blob.type,
						servers: [server],
						owners: [pubkey],
					});
				}
			} catch (e) {
				this.log('Failed to get blobs from', server);
				if (e instanceof Error) this.log(e.message);
			}
		}
	}

	queueBlobsFromEventContent(event: NostrEvent) {
		const matches = event.content.matchAll(
			/https?:\/\/([a-zA-Z0-9\.\-]+\.[a-zA-Z]+)([\p{L}\p{N}\p{M}&\.-\/\?=#\-@%\+_,:!~*]*)/gu,
		);
		if (!matches) return;

		for (const match of matches) {
			const hash = match[0].match(/\/([0-9a-f]{64})/i)?.[1];
			if (hash) this.addToQueue(hash, { urls: [match[0]], owners: [event.pubkey] });
		}
	}
}
