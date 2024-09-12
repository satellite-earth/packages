import { PropsWithChildren, createContext, useContext, useMemo } from 'react';
import { NostrEvent, Relay } from 'nostr-tools';

import communityRelaysService from '../../services/community-relays';

const CommunityContext = createContext<{ community: NostrEvent; relay: Relay } | null>(null);

export function useCommunityContext() {
	return useContext(CommunityContext);
}
export function useCurrentCommunity() {
	const context = useContext(CommunityContext);
	if (!context) throw new Error('Missing community context');
	return context;
}

export default function CommunityContextProvider({
	community,
	children,
}: PropsWithChildren<{ community: NostrEvent }>) {
	const context = useMemo(
		() => ({
			community,
			relay: communityRelaysService.getRelay(community.pubkey),
		}),
		[community],
	);

	return <CommunityContext.Provider value={context}>{children}</CommunityContext.Provider>;
}
