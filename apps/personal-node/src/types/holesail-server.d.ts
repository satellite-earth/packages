declare module 'holesail-server' {
	import HyperDHT, { KeyPair, Server } from 'hyperdht';

	type ServeArgs = {
		secure?: boolean;
		buffSeed?: Buffer;
		port?: number;
		address?: string;
	};

	export default class HolesailServer {
		dht: HyperDHT;
		server: Server | null;
		seed: Buffer | null;
		keyPair: KeyPair | null;
		buffer: Buffer | null;
		secure?: boolean;

		keyPairGenerator(buffer?: Buffer): KeyPair;
		serve(args: ServeArgs, callback?: () => void): void;
		destroy(): 0;
		getPublicKey(): string;
	}
}
