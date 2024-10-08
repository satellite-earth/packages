import { type WebPushChannel } from '@satellite-earth/core/types/control-api/notifications.js';
import { nanoid } from 'nanoid';

import { controlApi } from './personal-node';
import { serviceWorkerRegistration } from './worker';
import Subject from '../classes/subject';
import { deviceId } from './preferences';

export const pushSubscription = new Subject<PushSubscription | null>();
serviceWorkerRegistration.subscribe(async (registration) => {
	if (registration) {
		pushSubscription.next(await registration.pushManager.getSubscription());
	}
});

export async function enableNotifications() {
	if (!controlApi) throw new Error('Missing control api');
	const subscription = await serviceWorkerRegistration.value?.pushManager.subscribe({
		userVisibleOnly: true,
		applicationServerKey: controlApi.vapidKey.value,
	});

	if (subscription) {
		const json = subscription.toJSON();
		const { endpoint } = json;
		if (!endpoint) throw new Error('Missing endpoint');

		// @ts-expect-error
		const isMobile: boolean = navigator.userAgentData?.mobile ?? navigator.userAgent.includes('Android');
		const metadata: WebPushChannel = {
			id: `web:${nanoid()}`,
			type: 'web',
			device: deviceId.value,
			endpoint: endpoint!,
			expirationTime: subscription.expirationTime,
			keys: json.keys as WebPushChannel['keys'],
		};

		controlApi.send(['CONTROL', 'NOTIFICATIONS', 'REGISTER', metadata]);
		pushSubscription.next(subscription);
	} else throw new Error('Failed to register subscription');
}

export async function disableNotifications() {
	if (pushSubscription.value) {
		const key = pushSubscription.value.toJSON().keys?.p256dh;
		if (key) controlApi?.send(['CONTROL', 'NOTIFICATIONS', 'UNREGISTER', key]);

		await pushSubscription.value.unsubscribe();
	}
}
