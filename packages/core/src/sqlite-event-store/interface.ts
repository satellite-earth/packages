import EventEmitter from 'events';
import { Filter, NostrEvent } from 'nostr-tools';

type EventMap = {
	'event:inserted': [NostrEvent];
	'event:removed': [string];
};

export interface IEventStore extends EventEmitter<EventMap> {
	setup(): Promise<void>;
	addEvent(event: NostrEvent): boolean;
	removeEvents(ids: string[]): void;
	removeEvent(id: string): boolean;
	getEventsForFilters(filters: Filter[]): NostrEvent[];
	iterateEventsForFilters(filters: Filter[]): IterableIterator<NostrEvent>;
	countEventsForFilters(filters: Filter[]): number;
}
