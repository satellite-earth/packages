import { nanoid } from 'nanoid';
import { Filter, NostrEvent } from 'nostr-tools';
import { AbstractRelay } from 'nostr-tools/abstract-relay';

import relayPoolService from '../services/relay-pool';
import { isFilterEqual } from '../helpers/nostr/filter';
import ControlledObservable from './controlled-observable';
import PersistentSubscription from './persistent-subscription';

export default class MultiSubscription {
	static OPEN = 'open';
	static CLOSED = 'closed';

	id: string;
	name: string;
	filters: Filter[] = [];

	relays = new Set<AbstractRelay>();
	subscriptions = new Map<AbstractRelay, PersistentSubscription>();

	state = MultiSubscription.CLOSED;
	onEvent = new ControlledObservable<NostrEvent>();
	seenEvents = new Set<string>();

	constructor(name: string) {
		this.id = nanoid(8);
		this.name = name;
	}
	private handleEvent(event: NostrEvent) {
		if (this.seenEvents.has(event.id)) return;
		this.onEvent.next(event);
		this.seenEvents.add(event.id);
	}

	setFilters(filters: Filter[]) {
		if (isFilterEqual(this.filters, filters)) return;
		this.filters = filters;
		this.updateSubscriptions();
	}

	setRelays(relays: Iterable<string | URL | AbstractRelay>) {
		const newRelays = relayPoolService.getRelays(relays);

		// remove relays
		for (const relay of this.relays) {
			if (!newRelays.includes(relay)) {
				this.relays.delete(relay);
				const sub = this.subscriptions.get(relay);
				if (sub) {
					sub.destroy();
					this.subscriptions.delete(relay);
				}
			}
		}

		// add relays
		for (const relay of newRelays) {
			this.relays.add(relay);
		}

		this.updateSubscriptions();
	}

	private updateSubscriptions() {
		// close all subscriptions if not open
		if (this.state !== MultiSubscription.OPEN) {
			for (const [relay, subscription] of this.subscriptions) subscription.close();
			return;
		}

		// else open and update subscriptions
		for (const relay of this.relays) {
			let subscription = this.subscriptions.get(relay);
			if (!subscription || !isFilterEqual(subscription.filters, this.filters) || subscription.closed) {
				if (!subscription) {
					subscription = new PersistentSubscription(relay, {
						onevent: (event) => this.handleEvent(event),
					});

					this.subscriptions.set(relay, subscription);
				}

				if (subscription) {
					subscription.filters = this.filters;
					subscription.update().catch((err) => {
						// eat error
					});
				}
			}
		}
	}

	publish(event: NostrEvent) {
		return Promise.allSettled(
			Array.from(this.relays).map(async (r) => {
				if (!r.connected) await relayPoolService.requestConnect(r);
				return await r.publish(event);
			}),
		);
	}

	open() {
		if (this.state === MultiSubscription.OPEN) return this;

		this.state = MultiSubscription.OPEN;
		this.updateSubscriptions();

		return this;
	}
	waitForAllConnection(): Promise<void> {
		return Promise.allSettled(
			Array.from(this.relays)
				.filter((r) => !r.connected)
				.map((r) => r.connect()),
		).then((v) => void 0);
	}
	close() {
		if (this.state !== MultiSubscription.OPEN) return this;

		// forget all seen events
		this.forgetEvents();
		// unsubscribe from relay messages
		this.state = MultiSubscription.CLOSED;

		// close all
		this.updateSubscriptions();

		return this;
	}
	forgetEvents() {
		// forget all seen events
		this.seenEvents.clear();
	}

	destroy() {
		for (const [relay, sub] of this.subscriptions) {
			sub.destroy();
		}
	}
}
