import Subject from '../classes/subject';
import SuperMap from '../classes/super-map';

export const DRAFT_KEY_PREFIX = 'draft-';

class DraftService {
	onDraftsChange = new Subject<number>();
	drafts = new SuperMap<string, Subject<Record<string, any> | undefined>>((key) => {
		const cached = localStorage.getItem(DRAFT_KEY_PREFIX + key);

		let subject: Subject<Record<string, any> | undefined>;
		if (cached) {
			try {
				subject = new Subject(JSON.parse(cached));
			} catch (error) {
				subject = new Subject();
			}
		} else subject = new Subject();

		subject.subscribe((value) => {
			if (value !== undefined) {
				localStorage.setItem(DRAFT_KEY_PREFIX + key, JSON.stringify(value));
			} else localStorage.removeItem(DRAFT_KEY_PREFIX + key);
		});

		return subject;
	});

	hasDraft(key: string) {
		return this.drafts.get(key).value !== undefined;
	}
	getDraftSubject<T = Record<string, any>>(key: string) {
		return this.drafts.get(key) as Subject<T | undefined>;
	}
	getDraft<T = Record<string, any>>(key: string) {
		return this.drafts.get(key).value as T | undefined;
	}
	clearDraft(key: string) {
		this.drafts.get(key).next(undefined);
		this.onDraftsChange.next(Date.now());
	}
	setDraft(key: string, values: Record<string, any>) {
		this.getDraftSubject(key).next(values);
		this.onDraftsChange.next(Date.now());
	}
}

const draftService = new DraftService();

if (import.meta.env.DEV) {
	// @ts-expect-error
	window.draftService = draftService;
}

export default draftService;
