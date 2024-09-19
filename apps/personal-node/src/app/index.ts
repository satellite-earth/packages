import path from 'path';
import { WebSocketServer } from 'ws';
import { createServer, Server } from 'http';
import { IEventStore, NostrRelay, SQLiteEventStore } from '@satellite-earth/core';
import { getDMRecipient } from '@satellite-earth/core/helpers/nostr';
import { BlossomSQLite, IBlobMetadataStore, LocalStorage } from 'blossom-server-sdk';
import { kinds } from 'nostr-tools';
import { AbstractRelay } from 'nostr-tools/abstract-relay';
import express, { Express } from 'express';
import { EventEmitter } from 'events';
import cors from 'cors';

import { logger } from '../logger.js';
import Database from './database.js';

import { NIP_11_SOFTWARE_URL, SENSITIVE_KINDS } from '../const.js';
import { AUTH, DATA_PATH, OWNER_PUBKEY, PORT } from '../env.js';

import { isHex } from '../helpers/pubkey.js';

import ConfigManager from '../modules/config-manager.js';
import { BlobDownloader } from '../modules/blob-downloader.js';
import ControlApi from '../modules/control/control-api.js';
import ConfigActions from '../modules/control/config-actions.js';
import ReceiverActions from '../modules/control/receiver-actions.js';
import Receiver from '../modules/receiver/index.js';
import DatabaseActions from '../modules/control/database-actions.js';
import DirectMessageManager from '../modules/direct-message-manager.js';
import DirectMessageActions from '../modules/control/dm-actions.js';
import AddressBook from '../modules/address-book.js';
import NotificationsManager from '../modules/notifications/notifications-manager.js';
import NotificationActions from '../modules/control/notification-actions.js';
import ProfileBook from '../modules/profile-book.js';
import ContactBook from '../modules/contact-book.js';
import CautiousPool from '../modules/cautious-pool.js';
import RemoteAuthActions from '../modules/control/remote-auth-actions.js';
import ReportActions from '../modules/control/report-actions.js';
import LogStore from '../modules/log-store/log-store.js';
import DecryptionCache from '../modules/decryption-cache/decryption-cache.js';
import DecryptionCacheActions from '../modules/control/decryption-cache.js';
import Scrapper from '../modules/scrapper/index.js';
import LogsActions from '../modules/control/logs-actions.js';
import ApplicationStateManager from '../modules/state/application-state-manager.js';
import ScrapperActions from '../modules/control/scrapper-actions.js';
import InboundNetworkManager from '../modules/network/inbound/index.js';
import SecretsManager from '../modules/secrets-manager.js';
import outboundNetwork, { OutboundNetworkManager } from '../modules/network/outbound/index.js';

type EventMap = {
	listening: [];
};

export default class App extends EventEmitter<EventMap> {
	running = false;
	config: ConfigManager;
	secrets: SecretsManager;
	state: ApplicationStateManager;

	server: Server;
	wss: WebSocketServer;
	express: Express;

	inboundNetwork: InboundNetworkManager;
	outboundNetwork: OutboundNetworkManager;

	database: Database;
	eventStore: IEventStore;
	logStore: LogStore;
	relay: NostrRelay;
	receiver: Receiver;
	scrapper: Scrapper;
	control: ControlApi;
	reports: ReportActions;
	pool: CautiousPool;
	addressBook: AddressBook;
	profileBook: ProfileBook;
	contactBook: ContactBook;
	directMessageManager: DirectMessageManager;
	notifications: NotificationsManager;
	blobMetadata: IBlobMetadataStore;
	blobStorage: LocalStorage;
	blobDownloader: BlobDownloader;
	decryptionCache: DecryptionCache;

	constructor(dataPath: string) {
		super();

		this.config = new ConfigManager(path.join(dataPath, 'node.json'));
		this.config.read();

		this.secrets = new SecretsManager(path.join(dataPath, 'secrets.json'));
		this.secrets.read();

		// copy the vapid public key over to config so the web ui can access it
		// TODO: this should be moved to another place
		this.secrets.on('updated', () => {
			this.config.data.vapidPublicKey = this.secrets.get('vapidPublicKey');
		});

		// set owner pubkey from env variable
		if (!this.config.data.owner && OWNER_PUBKEY && isHex(OWNER_PUBKEY)) {
			this.config.setField('owner', OWNER_PUBKEY);
		}

		// create http and ws server interface
		this.server = createServer();
		this.inboundNetwork = new InboundNetworkManager(this);
		this.outboundNetwork = outboundNetwork;

		/** make the outbound network reflect the app config */
		this.outboundNetwork.listenToAppConfig(this.config);

		// setup express
		this.express = express();
		this.express.use(cors());
		this.setupExpress();

		// pass requests to express server
		this.server.on('request', this.express);

		// create websocket server
		this.wss = new WebSocketServer({ server: this.server });

		// Fix CORS for websocket
		this.wss.on('headers', (headers, request) => {
			headers.push('Access-Control-Allow-Origin: *');
		});

		// Init embedded sqlite database
		this.database = new Database({ directory: dataPath });

		// create log managers
		this.logStore = new LogStore(this.database.db);
		this.logStore.setup();

		this.state = new ApplicationStateManager(this.database.db);
		this.state.setup();

		// Recognize local relay by matching auth string
		this.pool = new CautiousPool((relay: AbstractRelay, challenge: string) => {
			for (const [socket, auth] of this.relay.auth) {
				if (auth.challenge === challenge) return true;
			}
			return false;
		});

		// Initialize the event store
		this.eventStore = new SQLiteEventStore(this.database.db);
		this.eventStore.setup();

		// setup decryption cache
		this.decryptionCache = new DecryptionCache(this.database.db);
		this.decryptionCache.setup();

		// Setup managers user contacts and profiles
		this.addressBook = new AddressBook(this);
		this.profileBook = new ProfileBook(this);
		this.contactBook = new ContactBook(this);

		// Setup the notifications manager
		this.notifications = new NotificationsManager(this /*this.eventStore, this.state*/);
		this.notifications.webPushKeys = {
			publicKey: this.secrets.get('vapidPublicKey'),
			privateKey: this.secrets.get('vapidPrivateKey'),
		};
		this.notifications.setup();

		this.eventStore.on('event:inserted', (event) => {
			if (this.notifications.shouldNotify(event)) this.notifications.notify(event);
		});

		// Initializes receiver and scrapper for pulling data from remote relays
		this.receiver = new Receiver(this);
		this.receiver.on('event', (event) => this.eventStore.addEvent(event));

		this.scrapper = new Scrapper(this);

		// pass events from the scrapper to the event store
		this.scrapper.on('event', (event) => this.eventStore.addEvent(event));

		// Initializes direct message manager for subscribing to DMs
		this.directMessageManager = new DirectMessageManager(this);

		// set watchInbox for owner when config is loaded or changed
		this.config.on('updated', (config) => {
			if (config.owner) this.directMessageManager.watchInbox(config.owner);
		});

		// API for controlling the node
		this.control = new ControlApi(this, AUTH);
		this.control.registerHandler(new ConfigActions(this));
		this.control.registerHandler(new ReceiverActions(this));
		this.control.registerHandler(new ScrapperActions(this));
		this.control.registerHandler(new DatabaseActions(this));
		this.control.registerHandler(new DirectMessageActions(this));
		this.control.registerHandler(new NotificationActions(this));
		this.control.registerHandler(new RemoteAuthActions(this));
		this.control.registerHandler(new DecryptionCacheActions(this));
		this.control.registerHandler(new LogsActions(this));

		// reports
		this.reports = new ReportActions(this);
		this.control.registerHandler(this.reports);

		// connect control api to websocket server
		this.control.attachToServer(this.wss);

		// if process has an RPC interface, attach control api to it
		if (process.send) this.control.attachToProcess(process);

		this.blobMetadata = new BlossomSQLite(this.database.db);
		this.blobStorage = new LocalStorage(path.join(DATA_PATH, 'blobs'));
		this.blobDownloader = new BlobDownloader(this.blobStorage, this.blobMetadata);

		this.relay = new NostrRelay(this.eventStore);
		this.relay.sendChallenge = true;
		this.relay.requireRelayInAuth = false;

		// attach relay to websocket server
		this.relay.attachToServer(this.wss);

		// update profiles when conversations are opened
		this.directMessageManager.on('open', (a, b) => {
			this.profileBook.loadProfile(a, this.addressBook.getOutboxes(a));
			this.profileBook.loadProfile(b, this.addressBook.getOutboxes(b));
		});

		// only allow the owner to NIP-42 authenticate with the relay
		this.relay.checkAuth = (ws, auth) => {
			// If owner is not set, update it to match the pubkey
			// that signed the auth message. This allows the user
			// to set the owner pubkey from the initial login when
			// setting up their personal node (the owner pubkey may
			// otherwise be set using the env var `OWNER_PUBKEY`)
			if (!this.config.data.owner) {
				this.config.update((config) => {
					logger(`Owner is unset, setting owner to first NIP-42 auth: ${auth.pubkey}`);
					config.owner = auth.pubkey;
				});
				return true;
			}
			if (auth.pubkey !== this.config.data.owner) return 'Pubkey dose not match owner';
			return true;
		};

		// when the owner NIP-42 authenticates with the relay pass it along to the control
		this.relay.on('socket:auth', (ws, auth) => {
			if (auth.pubkey === this.config.data.owner) {
				this.control.authenticatedConnections.add(ws);
			}
		});

		// if socket is unauthenticated only allow owner's events and incoming DMs
		this.relay.registerEventHandler((ctx, next) => {
			const auth = ctx.relay.getSocketAuth(ctx.socket);

			if (!auth) {
				// is it an incoming DM for the owner?
				if (ctx.event.kind === kinds.EncryptedDirectMessage && getDMRecipient(ctx.event) === this.config.data.owner)
					return next();

				if (ctx.event.pubkey === this.config.data.owner) return next();

				throw new Error(ctx.relay.makeAuthRequiredReason('This relay only accepts events from its owner'));
			}

			return next();
		});

		// handle forwarding direct messages by owner
		this.relay.registerEventHandler(async (ctx, next) => {
			if (ctx.event.kind === kinds.EncryptedDirectMessage && ctx.event.pubkey === this.config.data.owner) {
				// send direct message
				const results = await this.directMessageManager.forwardMessage(ctx.event);

				if (!results || !results.some((p) => p.status === 'fulfilled')) throw new Error('Failed to forward message');
				return `Forwarded message to ${results.filter((p) => p.status === 'fulfilled').length}/${results.length} relays`;
			} else return next();
		});

		// block subscriptions for sensitive kinds unless NIP-42 auth or Auth Code
		this.relay.registerSubscriptionFilter((ctx, next) => {
			// always allow if authenticated with auth code
			const isAuthenticatedWithAuthCode = this.control.authenticatedConnections.has(ctx.socket);
			if (isAuthenticatedWithAuthCode) return next();

			const hasSensitiveKinds = ctx.filters.some(
				(filter) => filter.kinds && SENSITIVE_KINDS.some((k) => filter.kinds?.includes(k)),
			);

			if (hasSensitiveKinds) {
				const auth = ctx.relay.getSocketAuth(ctx.socket);
				if (!auth) throw new Error(ctx.relay.makeAuthRequiredReason('Cant view sensitive events without auth'));
			}

			return next();
		});

		// Handle possible additional actions when the event store receives a new message
		this.eventStore.on('event:inserted', (event) => {
			const loadProfile = (pubkey: string) => {
				const profile = this.profileBook.getProfile(pubkey);
				if (!profile) {
					this.profileBook.loadProfile(pubkey, this.addressBook.getOutboxes(pubkey));
					this.addressBook.loadOutboxes(pubkey).then((outboxes) => {
						this.profileBook.loadProfile(pubkey, outboxes ?? undefined);
					});
				}
			};

			// Fetch profiles for all incoming DMs
			switch (event.kind) {
				case kinds.EncryptedDirectMessage:
					loadProfile(event.pubkey);
					break;
				default:
					loadProfile(event.pubkey);
					break;
			}
		});

		// Read the config again, this fires the "loaded" and "updated" events to synchronize all the other services
		// NOTE: its important this is called last. otherwise any this.config.on("update") listeners above will note fire
		this.config.read();
	}

	setupExpress() {
		this.express.get('/health', (req, res) => {
			res.status(200).send('Healthy');
		});

		// NIP-11
		this.express.get('/', (req, res, next) => {
			if (req.headers.accept === 'application/nostr+json') {
				res.send({
					name: this.config.data.name,
					description: this.config.data.description,
					software: NIP_11_SOFTWARE_URL,
					supported_nips: NostrRelay.SUPPORTED_NIPS,
					pubkey: this.config.data.owner,
				});
			} else return next();
		});
	}

	async start() {
		this.running = true;
		this.config.read();

		if (this.config.data.runReceiverOnBoot) this.receiver.start();
		if (this.config.data.runScrapperOnBoot) this.scrapper.start();

		this.tick();

		// start http server listening
		await new Promise<void>((res) => this.server.listen(PORT, () => res()));

		logger(`Listening on`, PORT);
		console.info('AUTH', AUTH);

		if (process.send) process.send({ type: 'RELAY_READY' });

		this.emit('listening');

		await this.inboundNetwork.start();
	}

	tick() {
		if (!this.running) return;

		setTimeout(this.tick.bind(this), 100);
	}

	async stop() {
		this.running = false;
		this.config.write();
		this.scrapper.stop();
		this.receiver.stop();
		await this.state.saveAll();
		this.reports.cleanup();
		this.relay.stop();
		this.database.destroy();
		this.receiver.destroy();

		await this.inboundNetwork.stop();
		await this.outboundNetwork.stop();

		// wait for server to close
		await new Promise<void>((res) => this.server.close(() => res()));
	}
}
