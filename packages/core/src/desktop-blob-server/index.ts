import { Router, ErrorRequestHandler } from 'express';
import expressAsyncHandler from 'express-async-handler';
import { type LocalStorage, type IBlobMetadataStore } from 'blossom-server-sdk';
import httpError from 'http-errors';
import { Debugger } from 'debug';

import { logger } from '../logger.js';

export class DesktopBlobServer {
	storagePath: string = 'data';
	metadata: IBlobMetadataStore;
	router: Router;
	storage: LocalStorage;

	log: Debugger;

	static getSha256FromPath(path: string) {
		const match = path.match(/([0-9a-f]{64})(\.[a-z]+)?/);
		if (!match) return;
		const sha256 = match[1];
		const ext: string | undefined = match[2];
		return { sha256, ext };
	}

	constructor(storage: LocalStorage, metadataStore: IBlobMetadataStore) {
		this.metadata = metadataStore;
		this.storage = storage;

		this.log = logger.extend('blob-server');
		this.storage.log = this.log.extend('storage');

		this.router = Router({});
		this.attach(this.router);
	}

	attach(base: Router) {
		base.get<{ pubkey: string }>(
			'/list/:pubkey',
			expressAsyncHandler(async (req, res, next) => {
				const blobs = await this.metadata.getOwnerBlobs(req.params.pubkey);
				res.status(200).send(blobs);
			}),
		);

		base.head<{ sha256: string }>(
			'/:sha256',
			expressAsyncHandler(async (req, res, next) => {
				const { sha256, ext } = DesktopBlobServer.getSha256FromPath(req.params.sha256) || {};
				if (!sha256) return next();

				if ((await this.metadata.hasBlob(sha256)) && (await this.storage.hasBlob(sha256))) {
					const type = ext || (await this.metadata.getBlob(sha256)).type;
					if (type) res.type(type);
					res.status(200).end();
				} else {
					throw new httpError.NotFound('Blob not found');
				}
			}),
		);

		base.get<{ sha256: string }>(
			'/:sha256',
			expressAsyncHandler(async (req, res, next) => {
				const { sha256, ext } = DesktopBlobServer.getSha256FromPath(req.params.sha256) || {};
				if (!sha256) return next();

				if ((await this.metadata.hasBlob(sha256)) && (await this.storage.hasBlob(sha256))) {
					const type = ext || (await this.metadata.getBlob(sha256)).type;
					if (type) res.type(type);
					res.status(200);
					const stream = await this.storage.readBlob(sha256);
					stream.pipe(res);
				} else {
					throw new httpError.NotFound('Blob not found');
				}
			}),
		);

		base.put('/', (req, res, next) => {
			return next(new httpError.NotImplemented('Uploads are not implemented on this server'));
		});

		base.delete('/', (req, res, next) => {
			return next(new httpError.NotImplemented('Uploads are not implemented on this server'));
		});

		const handleError: ErrorRequestHandler = (err, req, res, next) => {
			if (err instanceof httpError.HttpError) {
				res.status(err.status).send({ message: err.message });
			} else if (err instanceof Error) {
				res.status(500).send({ message: 'Something broke' });
			} else {
				next();
			}
		};
		base.use(handleError);

		return base;
	}
}
