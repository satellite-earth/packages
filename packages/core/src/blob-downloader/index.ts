import { BlossomClient, Signer } from 'blossom-client-sdk';
import { IBlobMetadataStore, IBlobStorage } from 'blossom-server-sdk';
import { readStreamFromURL } from '../helpers/url.js';
import { Debugger } from 'debug';
import { logger } from '../logger.js';
import { NostrEvent } from 'nostr-tools';

function compressHex(pubkey: string) {
	if (pubkey.length > 16) return pubkey.slice(0, 7);
	return pubkey;
}

export class BlobDownloader {
	storage: IBlobStorage;
	metadata: IBlobMetadataStore;

	log: Debugger = logger.extend('blob-downloader');

	// queue of blobs to download
	queue: {
		sha256: string;
		servers?: string[];
		type?: string;
		size?: number;
		owners?: string[];
	}[] = [];

	constructor(storage: IBlobStorage, metadata: IBlobMetadataStore) {
		this.storage = storage;
		this.metadata = metadata;
	}

	async downloadNext() {
		if (this.queue.length === 0) return;
		const queued = this.queue.shift();
		if (!queued) return;

		let { sha256, servers, owners, type, size } = queued;

		if (servers && (await this.storage.hasBlob(queued.sha256)) === false) {
			this.log('Downloading blob', compressHex(sha256));

			for (const server of servers) {
				const res = await readStreamFromURL(new URL(sha256, server));
				type = type || res.headers['content-type'];

				await this.storage.writeBlob(sha256, res, type);

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

		if (metadata.owners) {
			if (existing.owners) existing.owners = [...existing.owners, ...metadata.owners];
			else existing.owners = metadata.owners;
		}

		return added;
	}

	async queueBlobsFromPubkey(pubkey: string, servers: string[], signer?: Signer) {
		this.log('Adding blobs from pubkey', compressHex(pubkey));
		const auth = signer ? await BlossomClient.getListAuth(signer, 'Backup Blobs') : undefined;

		let n = 0;
		for (const server of servers) {
			try {
				const blobs = await BlossomClient.listBlobs(server, pubkey, {}, auth);
				for (const blob of blobs) {
					const added = this.addToQueue(blob.sha256, {
						size: blob.size,
						type: blob.type,
						servers: [server],
						owners: [pubkey],
					});

					if (added) n++;
				}
			} catch (e) {
				this.log('Failed to get blobs from', server);
				if (e instanceof Error) this.log(e.message);
			}
		}
		this.log(`Queued ${n} blobs for download`);
	}

	queueBlobsFromEventContent(event: NostrEvent) {
		// TODO: extract blob URLs and add them to the queue
	}
}
