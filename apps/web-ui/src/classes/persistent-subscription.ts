import { nanoid } from 'nanoid';
import { Filter, Relay } from 'nostr-tools';
import { AbstractRelay, Subscription, SubscriptionParams } from 'nostr-tools/abstract-relay';

import relayPoolService from '../services/relay-pool';

export default class PersistentSubscription {
	id: string;
	relay: Relay;
	filters: Filter[];
	closed = true;
	params: Partial<SubscriptionParams>;

	subscription: Subscription | null = null;
	get eosed() {
		return !!this.subscription?.eosed;
	}

	constructor(relay: AbstractRelay, params?: Partial<SubscriptionParams>) {
		this.id = nanoid(8);
		this.filters = [];
		this.params = {
			// @ts-expect-error
			id: this.id,
			...params,
		};

		this.relay = relay;
	}

	/** attempts to update the subscription */
	async update() {
		if (!this.filters || this.filters.length === 0) throw new Error('Missing filters');

		if (!(await relayPoolService.waitForOpen(this.relay))) throw new Error('Failed to connect to relay');

		this.closed = false;

		// recreate the subscription if its closed since nostr-tools cant reopen a sub
		if (!this.subscription || this.subscription.closed) {
			this.subscription = this.relay.subscribe(this.filters, {
				...this.params,
				oneose: () => {
					this.params.oneose?.();
				},
				onclose: (reason) => {
					if (!this.closed) {
						// unexpected close, reconnect?
						console.log('Unexpected closed', this.relay, reason);

						this.closed = true;
					}
					this.params.onclose?.(reason);
				},
			});
		} else {
			this.subscription.filters = this.filters;
			// NOTE: reset the eosed flag since nostr-tools dose not
			this.subscription.eosed = false;
			this.subscription.fire();
		}
	}
	close() {
		if (this.closed) return this;

		this.closed = true;
		if (this.subscription?.closed === false) this.subscription.close();

		return this;
	}

	destroy() {
		this.close();
	}
}
