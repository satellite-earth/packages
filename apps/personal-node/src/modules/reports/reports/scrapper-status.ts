import { NostrEvent } from 'nostr-tools';
import _throttle from 'lodash.throttle';
import Report from '../report.js';

export default class ScrapperStatusReport extends Report<'SCRAPPER_STATUS'> {
	readonly type = 'SCRAPPER_STATUS';

	eventsPerSecond: number[] = [0];

	update() {
		const averageEventsPerSecond = this.eventsPerSecond.reduce((m, v) => m + v, 0) / this.eventsPerSecond.length;

		const pubkeys = Array.from(this.app.scrapper.scrappers.keys()).length;

		let activeSubscriptions = 0;
		for (const [pubkey, scrapper] of this.app.scrapper.scrappers) {
			for (const [relay, relayScrapper] of scrapper.relayScrappers) {
				if (relayScrapper.running) activeSubscriptions++;
			}
		}

		this.send({
			running: this.app.scrapper.running,
			eventsPerSecond: averageEventsPerSecond,
			activeSubscriptions,
			pubkeys,
		});
	}

	async setup() {
		const onEvent = (event: NostrEvent) => {
			this.eventsPerSecond[0]++;
		};

		this.app.scrapper.on('event', onEvent);

		const tick = setInterval(() => {
			// start a new second
			this.eventsPerSecond.unshift(0);

			// limit to 60 seconds
			while (this.eventsPerSecond.length > 60) this.eventsPerSecond.pop();

			this.update();
		}, 1000);

		return () => {
			this.app.scrapper.off('event', onEvent);
			clearInterval(tick);
		};
	}

	async execute(args: {}): Promise<void> {
		this.update();
	}
}
