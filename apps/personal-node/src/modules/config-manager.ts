import { JSONFileSync } from 'lowdb/node';
import _throttle from 'lodash.throttle';
import { uniqueNamesGenerator, adjectives, colors, animals } from 'unique-names-generator';

import { logger } from '../logger.js';
import { PrivateNodeConfig } from '@satellite-earth/core/types/private-node-config.js';
import { ReactiveJsonFileSync } from '@satellite-earth/core';

export const defaultConfig: PrivateNodeConfig = {
	name: uniqueNamesGenerator({
		dictionaries: [colors, adjectives, animals],
	}),
	description: '',

	autoListen: false,
	runReceiverOnBoot: true,
	runScrapperOnBoot: false,
	logsEnabled: true,
	requireReadAuth: false,
	publicAddresses: [],

	hyperEnabled: false,

	enableTorConnections: true,
	enableI2PConnections: true,
	enableHyperConnections: false,
	routeAllTrafficThroughTor: false,
};

export default class ConfigManager extends ReactiveJsonFileSync<PrivateNodeConfig> {
	log = logger.extend('ConfigManager');

	constructor(path: string) {
		super(new JSONFileSync(path), defaultConfig);

		this.on('loaded', () => {
			// explicitly set default values if fields are not set
			for (const [key, value] of Object.entries(defaultConfig)) {
				// @ts-expect-error
				if (this.db[key] === undefined) {
					// @ts-expect-error
					this.db[key] = value;
				}
			}

			this.write();
		});
	}

	setField(field: keyof PrivateNodeConfig, value: any) {
		this.log(`Setting ${field} to ${value}`);
		// @ts-expect-error
		this.data[field] = value;

		this.write();
	}
}
