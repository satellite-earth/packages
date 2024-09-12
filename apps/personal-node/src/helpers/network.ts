import net from 'net';

export function testTCPConnection(host: string, port: number, timeout = 5000) {
	return new Promise((resolve, reject) => {
		const socket = new net.Socket();

		const timer = setTimeout(() => {
			socket.destroy();
			reject(new Error('Connection timed out'));
		}, timeout);

		socket.connect(port, host, () => {
			clearTimeout(timer);
			socket.destroy();
			resolve(true);
		});

		socket.on('error', (err) => {
			clearTimeout(timer);
			reject(err);
		});
	});
}
