import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { Transform } from 'stream';
import { nip19 } from 'nostr-tools';

// Missing types for process-streams
// @ts-expect-error
import ProcessStream from 'process-streams';

const loadJson = (params: { path: string }) => {
	let object;

	try {
		const data = fs.readFileSync(params.path);

		object = JSON.parse(data.toString('utf8'));
	} catch (err) {
		console.log(err);
	}

	if (object) {
		return object;
	}
};

const saveJson = (data: any, params: { path: string }) => {
	try {
		fs.writeFileSync(params.path, Buffer.from(JSON.stringify(data)));
	} catch (err) {
		console.log(err);
	}
};

const writeJsonl = (
	jsonArray: any[],
	params: { outputName: string; compress?: boolean; outputPath: string; compressionLevel?: number },
) => {
	return new Promise<void>((resolve, reject) => {
		const filename = params.compress ? `${params.outputName}.temp.jsonl` : `${params.outputName}.jsonl`;
		const writableStream = fs.createWriteStream(path.join(params.outputPath, filename));

		const transform = new Transform({
			transform: (json, encoding, callback) => {
				callback(null, json);
			},
		});

		const indexf = jsonArray.length - 1;

		transform.pipe(writableStream);

		jsonArray.forEach((item, index) => {
			transform.write(JSON.stringify(item) + (index === indexf ? '' : '\n'));
		});

		transform.end();

		writableStream.on('finish', async () => {
			console.log('got finish');

			if (params.compress) {
				const outputPath = path.join(params.outputPath, `${params.outputName}.jsonl.zst`);
				const inputPath = path.join(params.outputPath, filename);

				try {
					// Compress using ZSTD
					await CompressZSTD({
						level: params.compressionLevel,
						outputPath,
						inputPath,
					});

					// Cleanup the temporary file
					fs.unlinkSync(inputPath);

					resolve();
				} catch (err) {
					console.log(err);
					reject(err);
				}
			} else {
				resolve();
			}
		});

		writableStream.on('error', (err) => {
			reject(err);
		});
	});
};

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const CompressZSTD = (params: { outputPath: string; inputPath: string; level?: number }) => {
	return new Promise<void>((resolve, reject) => {
		const ps = new ProcessStream();

		// Detect architecture to pass the correct native zstd module
		const cs = ps
			.spawn(path.resolve(__dirname, `../../lib/bin/${process.arch === 'arm64' ? 'arm64' : 'x64'}/zstd`), [
				`-${typeof params.level === 'undefined' ? 7 : params.level}`,
			])
			.on('exit', (code: number, signal: string) => {
				console.log('exit', code, signal);

				if (code !== 0) {
					reject();
				}
			});

		const output = fs.createWriteStream(params.outputPath);

		fs.createReadStream(params.inputPath)
			.pipe(cs)
			.pipe(output)
			.on('error', (err: Error) => {
				console.log(err);
				reject(err);
			})
			.on('finish', () => {
				console.log('compress finished!');
				resolve();
			});
	});
};

export { loadJson, saveJson, writeJsonl };
