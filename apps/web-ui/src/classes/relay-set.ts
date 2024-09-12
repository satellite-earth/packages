import { Relay } from 'nostr-tools';
import relayPoolService from '../services/relay-pool';

export type RelaySetFrom = Iterable<string | URL | Relay> | Relay | string | URL;

export default class RelaySet extends Set<Relay> {
	get urls() {
		return Array.from(this);
	}

	clone() {
		return new RelaySet(this);
	}
	merge(...sources: (RelaySetFrom | undefined)[]): this {
		for (const src of sources) {
			if (!src) continue;
			if (src instanceof Relay || src instanceof URL || typeof src === 'string') {
				const relay = relayPoolService.getRelay(src);
				if (relay) this.add(relay);
			} else {
				const relays = relayPoolService.getRelays(src);

				for (const relay of relays) {
					this.add(relay);
				}
			}
		}
		return this;
	}

	static from(...sources: (RelaySetFrom | undefined)[]) {
		const set = new RelaySet();
		return set.merge(...sources);
	}
}
