import { clearInterval, setInterval } from 'timers';
import { WebSocket, WebSocketServer } from 'ws';

/**
 * A helper method for setting up an interval on a websocket server
 * to automatically disconnect clients if they become inactive
 */
export function terminateConnectionsInterval(wss: WebSocketServer, interval = 30000) {
	const alive = new WeakMap<WebSocket, boolean>();

	const id = setInterval(() => {
		for (const ws of wss.clients) {
			if (!alive.get(ws)) ws.terminate();
			else {
				alive.set(ws, false);
				ws.ping();
			}
		}
	}, interval);

	wss.on('connection', (ws) => {
		alive.set(ws, true);

		ws.on('pong', () => {
			alive.set(ws, true);
		});
	});
	wss.on('close', () => {
		clearInterval(id);
	});
}
