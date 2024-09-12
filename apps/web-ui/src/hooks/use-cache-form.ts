import { useCallback, useEffect, useMemo, useRef } from 'react';
import { FieldValues, UseFormGetValues, UseFormReset, UseFormStateReturn } from 'react-hook-form';
import { useBeforeUnload } from 'react-router-dom';

import { logger } from '../helpers/debug';
import useSubject from './use-subject';
import draftService from '../services/drafts';

export function useDraft<TFieldValues extends FieldValues = FieldValues>(key: string | null) {
	return useSubject(key ? draftService.getDraftSubject<TFieldValues>(key) : undefined);
}

export default function useCacheForm<TFieldValues extends FieldValues = FieldValues>(
	key: string | null,
	getValues: UseFormGetValues<TFieldValues>,
	reset: UseFormReset<TFieldValues>,
	state: UseFormStateReturn<TFieldValues>,
	opts?: { clearOnKeyChange: boolean; isEmpty?: (values: TFieldValues) => boolean },
) {
	const log = useMemo(() => (key ? logger.extend(`CachedForm:${key}`) : () => {}), [key]);

	const stateRef = useRef<UseFormStateReturn<TFieldValues>>(state);
	stateRef.current = state;

	const isEmptyRef = useRef(opts?.isEmpty);
	isEmptyRef.current = opts?.isEmpty;

	// NOTE: this watches the dirty state
	state.isDirty;
	state.isSubmitted;

	useEffect(() => {
		if (!key) return;

		// restore form on key change or mount
		try {
			const draft = draftService.getDraft<TFieldValues>(key);

			if (draft) {
				log('Restoring form');
				reset(draft, { keepDefaultValues: true });
			} else if (opts?.clearOnKeyChange) {
				log('Clearing form');
				reset();
			}
		} catch (e) {}

		// save previous key on change or unmount
		return () => {
			const values = getValues();
			if (stateRef.current.isSubmitted || isEmptyRef.current?.(values)) {
				log('Removing because submitted');
				draftService.clearDraft(key);
			} else if (stateRef.current.isDirty) {
				log('Saving form', values);
				draftService.setDraft(key, values);
			}
		};
	}, [key, log, opts?.clearOnKeyChange]);

	const saveOnClose = useCallback(() => {
		if (!key) return;

		const values = getValues();
		if (stateRef.current.isSubmitted || isEmptyRef.current?.(values)) {
			log('Removing because submitted');
			draftService.clearDraft(key);
		} else if (stateRef.current.isDirty) {
			const values = getValues();
			log('Saving form', values);
			draftService.setDraft(key, values);
		}
	}, [log, getValues, key]);

	useBeforeUnload(saveOnClose);

	return useCallback(() => {
		if (key) draftService.clearDraft(key);
	}, [key]);
}
