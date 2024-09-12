import { Server } from 'http';

export function closeHttpServer(server: Server) {
	return new Promise<void>((res, rej) => {
		server.close((err) => {
			if (err) rej(err);
			else res();
		});
	});
}
