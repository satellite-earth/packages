import useReplaceableEvent from './use-replaceable-event';

export default function useCommunityDefinition(pubkey?: string, relay?: string) {
	return useReplaceableEvent(
		pubkey
			? {
					kind: 12012,
					pubkey,
					relays: relay ? [relay] : [],
				}
			: undefined,
	);
}
