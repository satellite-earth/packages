import { ClientRequestArgs } from 'http';
import { ClientOptions, WebSocket } from 'ws';

import outboundNetwork from './index.js';

/** extends the WebSocket class from ws to always use the custom http agent */
export default class OutboundProxyWebSocket extends WebSocket {
	constructor(address: string | URL, options?: ClientOptions | ClientRequestArgs) {
		super(address, { agent: outboundNetwork.agent, ...options });
	}
}
