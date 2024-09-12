import { AddressInfo } from 'net';

export interface InboundInterface {
	available: boolean;
	running: boolean;
	error?: Error;

	address?: string;
	start(address: AddressInfo): Promise<void>;
	stop(): Promise<void>;
}

export interface OutboundInterface {
	available: boolean;
	running: boolean;
	error?: Error;

	type: 'SOCKS5' | 'HTTP';
	address?: string;
	start(): Promise<void>;
	stop(): Promise<void>;
}
