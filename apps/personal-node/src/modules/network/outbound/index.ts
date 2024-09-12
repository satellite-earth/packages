import { PacProxyAgent } from 'pac-proxy-agent';
import _throttle from 'lodash.throttle';

import { logger } from '../../../logger.js';
import ConfigManager from '../../config-manager.js';
import HyperOutbound from './hyper.js';
import TorOutbound from './tor.js';
import I2POutbound from './i2p.js';

export class OutboundNetworkManager {
	log = logger.extend('Network:Outbound');
	hyper: HyperOutbound;
	tor: TorOutbound;
	i2p: I2POutbound;

	running = false;
	agent: PacProxyAgent<string>;

	enableHyperConnections = false;
	enableTorConnections = false;
	enableI2PConnections = false;
	routeAllTrafficThroughTor = false;

	constructor() {
		this.hyper = new HyperOutbound();
		this.tor = new TorOutbound();
		this.i2p = new I2POutbound();

		this.agent = new PacProxyAgent(this.buildPacURI(), { fallbackToDirect: true });
	}

	private buildPacURI() {
		const statements: string[] = [];

		if (this.i2p.available && this.enableI2PConnections) {
			statements.push(
				`
if (shExpMatch(host, "*.i2p"))
{
	return "${this.i2p.type} ${this.i2p.address}";
}
`.trim(),
			);
		}

		if (this.tor.available && this.enableTorConnections) {
			statements.push(
				`
if (shExpMatch(host, "*.onion"))
{
	return "${this.tor.type} ${this.tor.address}";
}
`.trim(),
			);
		}

		if (this.hyper.available && this.enableHyperConnections) {
			statements.push(
				`
if (shExpMatch(host, "*.hyper"))
{
	return "${this.hyper.type} ${this.hyper.address}";
}
`.trim(),
			);
		}

		if (this.routeAllTrafficThroughTor && this.tor.available) {
			// if tor is available, route all traffic through it
			statements.push(`${this.tor.type} ${this.tor.address}`);
			this.log('Routing all traffic through tor proxy');
		} else {
			statements.push('return "DIRECT";');
		}

		const PACFile = `
// SPDX-License-Identifier: CC0-1.0

function FindProxyForURL(url, host)
{
	${statements.join('\n')}
}
`.trim();

		return 'pac+data:application/x-ns-proxy-autoconfig;base64,' + btoa(PACFile);
	}

	updateAgent(uri = this.buildPacURI()) {
		this.log('Updating PAC proxy agent');
		// copied from https://github.com/TooTallNate/proxy-agents/blob/main/packages/pac-proxy-agent/src/index.ts#L79C22-L79C51
		this.agent.uri = new URL(uri.replace(/^pac\+/i, ''));

		// forces the agent to refetch the resolver and pac file
		this.agent.resolverPromise = undefined;
	}

	updateAgentThrottle: () => void = _throttle(this.updateAgent.bind(this), 100);

	/** A helper method to make the manager run off of the app config */
	listenToAppConfig(config: ConfigManager) {
		config.on('updated', (c) => {
			this.enableHyperConnections = c.hyperEnabled && c.enableHyperConnections;
			this.enableTorConnections = c.enableTorConnections;
			this.enableI2PConnections = c.enableI2PConnections;
			this.routeAllTrafficThroughTor = c.routeAllTrafficThroughTor;

			if (this.hyper.available && this.enableHyperConnections !== this.hyper.running) {
				if (this.enableHyperConnections) this.hyper.start();
				else this.hyper.stop();
			}

			if (this.tor.available && this.enableTorConnections !== this.tor.running) {
				if (this.enableTorConnections) this.tor.start();
				else this.tor.stop();
			}

			if (this.i2p.available && this.enableI2PConnections !== this.i2p.running) {
				if (this.enableI2PConnections) this.i2p.start();
				else this.i2p.stop();
			}

			this.updateAgentThrottle();
		});
	}

	async stop() {
		await this.hyper.stop();
		await this.tor.stop();
	}
}

const outboundNetwork = new OutboundNetworkManager();

export default outboundNetwork;
