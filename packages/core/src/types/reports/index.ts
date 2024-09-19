import { NostrEvent } from 'nostr-tools';
import { NotificationChannel } from '../control-api/notifications.js';

type NetworkOutboundInterface = { available: boolean; running?: boolean; error?: string };
type NetworkInboundInterface = { available: boolean; running?: boolean; error?: string; address?: string };

export type ReportArguments = {
	OVERVIEW: {};
	CONVERSATIONS: { pubkey: string };
	LOGS: { service?: string };
	SERVICES: {};
	DM_SEARCH: { query: string; conversation?: [string, string]; order?: 'rank' | 'created_at' };
	SCRAPPER_STATUS: {};
	RECEIVER_STATUS: {};
	NETWORK_STATUS: {};
	NOTIFICATION_CHANNELS: {};
	EVENTS_SUMMARY: { pubkey?: string; kind?: number; order?: 'interactions' | 'created_at'; limit: number };
};

export type ReportResults = {
	OVERVIEW: { pubkey: string; events: number; active: number };
	CONVERSATIONS: {
		pubkey: string;
		count: number;
		sent: number;
		received: number;
		lastReceived?: number;
		lastSent?: number;
	};
	LOGS: { id: string; message: string; service: string; timestamp: number };
	SERVICES: { id: string };
	DM_SEARCH: { event: NostrEvent; plaintext: string };
	SCRAPPER_STATUS: { running: boolean; eventsPerSecond: number; activeSubscriptions: number; pubkeys: number };
	RECEIVER_STATUS: {
		status: 'starting' | 'running' | 'stopped' | 'errored';
		startError?: string;
		subscriptions: { relay: string; pubkeys: string[]; closed: boolean }[];
	};
	NETWORK_STATUS: {
		tor: { outbound: NetworkOutboundInterface; inbound: NetworkInboundInterface };
		hyper: { outbound: NetworkOutboundInterface; inbound: NetworkInboundInterface };
		i2p: { outbound: NetworkOutboundInterface; inbound: NetworkInboundInterface };
	};
	NOTIFICATION_CHANNELS: NotificationChannel | ['removed', string];
	EVENTS_SUMMARY: { event: NostrEvent; reactions: number; shares: number; replies: number };
};
