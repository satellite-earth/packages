declare module 'holesail-server' {
	type KeyPair = {
		privateKey: Buffer;
		publicKey: Buffer;
	};

	export default class HolesailServer {
		keyPair(buffSeed?: string): KeyPair;
		serve(args: { port: number; address: string; buffSeed?: string }, callback?: () => void): Promise<void>;
		destroy(): void;
		shutdown(): Promise<void>;
		getPublicKey(): string;
	}
}
