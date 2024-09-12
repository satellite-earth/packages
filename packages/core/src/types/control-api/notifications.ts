import { NostrEvent } from 'nostr-tools';

type DeviceType = 'mobile' | 'desktop';

type BaseChannel = {
	id: string;
	type: string;
	device?: string;
};
export type WebPushChannel = BaseChannel & {
	type: 'web';
	endpoint: string;
	expirationTime: PushSubscriptionJSON['expirationTime'];
	keys: {
		p256dh: string;
		auth: string;
	};
};
export type NtfyChannel = BaseChannel & {
	type: 'ntfy';
	server: string;
	topic: string;
};

export type NotificationChannel = WebPushChannel | NtfyChannel;

type NotificationsRegister = ['CONTROL', 'NOTIFICATIONS', 'REGISTER', NotificationChannel];
type NotificationsUnregister = ['CONTROL', 'NOTIFICATIONS', 'UNREGISTER', string];
type NotificationsNotify = ['CONTROL', 'NOTIFICATIONS', 'NOTIFY', string];
type NotificationsGetVapidKey = ['CONTROL', 'NOTIFICATIONS', 'GET-VAPID-KEY'];

type NotificationsVapidKey = ['CONTROL', 'NOTIFICATIONS', 'VAPID-KEY', string];

export type NotificationsMessage =
	| NotificationsRegister
	| NotificationsUnregister
	| NotificationsNotify
	| NotificationsGetVapidKey;
export type NotificationsResponse = NotificationsVapidKey;

// push notification types
export type WebPushNotification = {
	title: string;
	body: string;
	icon: string;
	url: string;
	event: NostrEvent;
};

export type NotificationType = WebPushNotification;
