import followRedirects from 'follow-redirects';
import { type IncomingMessage } from 'http';
const { http, https } = followRedirects;

export function readStreamFromURL(url: string | URL): Promise<IncomingMessage> {
	const isSecure = typeof url === 'string' ? url.startsWith('https') : url.protocol === 'https:';

	return new Promise((resolve, reject) => {
		(isSecure ? https : http)
			.get(url, (res) => {
				if (!res.statusCode) return reject();
				if (res.statusCode < 200 || res.statusCode >= 400) {
					res.destroy();
					reject(res);
				} else resolve(res);
			})
			.end();
	});
}
