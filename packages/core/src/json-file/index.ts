import { EventEmitter } from 'events';
import { Adapter, Low, LowSync, SyncAdapter } from 'lowdb';

type EventMap<T> = {
	/** fires when file is loaded */
	loaded: [T];
	/** fires when a field is set */
	changed: [T, string, any];
	/** fires when file is loaded or changed */
	updated: [T];
	saved: [T];
};

export class ReactiveJsonFile<T extends object> extends EventEmitter<EventMap<T>> implements Low<T> {
	protected db: Low<T>;
	adapter: Adapter<T>;

	data: T;

	constructor(adapter: Adapter<T>, defaultData: T) {
		super();

		this.adapter = adapter;
		this.db = new Low<T>(adapter, defaultData);

		this.data = this.createProxy();
	}

	private createProxy() {
		return (this.data = new Proxy(this.db.data, {
			get(target, prop, receiver) {
				return Reflect.get(target, prop, receiver);
			},
			set: (target, p, newValue, receiver) => {
				Reflect.set(target, p, newValue, receiver);
				this.emit('changed', target as T, String(p), newValue);
				this.emit('updated', target as T);
				return true;
			},
		}));
	}

	async read() {
		await this.db.read();
		this.emit('loaded', this.data);
		this.emit('updated', this.data);
		this.createProxy();
	}
	async write() {
		await this.db.write();
		this.emit('saved', this.data);
	}
	update(fn: (data: T) => unknown) {
		return this.db.update(fn);
	}
}

export class ReactiveJsonFileSync<T extends object> extends EventEmitter<EventMap<T>> implements LowSync<T> {
	protected db: LowSync<T>;
	adapter: SyncAdapter<T>;

	data: T;

	constructor(adapter: SyncAdapter<T>, defaultData: T) {
		super();

		this.adapter = adapter;
		this.db = new LowSync<T>(adapter, defaultData);

		this.data = this.createProxy();
	}

	private createProxy() {
		return (this.data = new Proxy(this.db.data, {
			get(target, prop, receiver) {
				return Reflect.get(target, prop, receiver);
			},
			set: (target, p, newValue, receiver) => {
				Reflect.set(target, p, newValue, receiver);
				this.emit('changed', target as T, String(p), newValue);
				this.emit('updated', target as T);
				return true;
			},
		}));
	}

	read() {
		this.db.read();
		this.emit('loaded', this.data);
		this.emit('updated', this.data);
		this.createProxy();
	}
	write() {
		this.db.write();
		this.emit('saved', this.data);
	}
	update(fn: (data: T) => unknown) {
		return this.db.update(fn);
	}
}
