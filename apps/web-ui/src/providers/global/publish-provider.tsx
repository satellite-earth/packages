import { PropsWithChildren, createContext, useCallback, useContext, useMemo } from 'react';
import { useToast } from '@chakra-ui/react';
import { EventTemplate, NostrEvent } from 'nostr-tools';
import { isReplaceable } from '@satellite-earth/core/helpers/nostr';

import { useSigningContext } from './signing-provider';
import replaceableEventsService from '../../services/replaceable-events';
import relayPoolService from '../../services/relay-pool';
import RelaySet, { RelaySetFrom } from '../../classes/relay-set';

type PublishContextType = {
	publishEvent(
		event: EventTemplate | NostrEvent,
		relays: RelaySetFrom,
		quite?: boolean,
	): Promise<{ event?: NostrEvent; results: PromiseSettledResult<string>[] }>;
};
export const PublishContext = createContext<PublishContextType>({
	publishEvent: async () => {
		throw new Error('Publish provider not setup');
	},
});

export function usePublishEvent() {
	return useContext(PublishContext).publishEvent;
}

export default function PublishProvider({ children }: PropsWithChildren) {
	const toast = useToast();
	const { requestSignature } = useSigningContext();

	const publishEvent = useCallback<PublishContextType['publishEvent']>(
		async (event: EventTemplate | NostrEvent, urls, quite = true) => {
			try {
				const relays = relayPoolService.getRelays(RelaySet.from(urls));

				let signed: NostrEvent;
				if (!Object.hasOwn(event, 'sig')) {
					signed = await requestSignature(event as EventTemplate);
				} else {
					signed = event as NostrEvent;
				}

				let results: PromiseSettledResult<string>[] = [];
				if (relays.length === 1) {
					const value = await relays[0].publish(signed);
					results = [{ status: 'fulfilled', value }];
				} else {
					results = await Promise.allSettled(
						relays.map(async (relay) => {
							await relayPoolService.waitForOpen(relay);
							return await relay.publish(signed);
						}),
					);

					if (!results.some((r) => r.status === 'fulfilled')) throw new Error('Failed to publish to any relay');
				}

				// pass it to other services
				if (isReplaceable(signed.kind)) replaceableEventsService.handleEvent(signed);

				return { results, event: signed };
			} catch (e) {
				if (e instanceof Error)
					toast({
						description: e.message,
						status: 'error',
					});
				if (!quite) throw e;
				else return { results: [] };
			}
		},
		[toast, requestSignature],
	);

	const context = useMemo<PublishContextType>(
		() => ({
			publishEvent,
		}),
		[publishEvent],
	);

	return <PublishContext.Provider value={context}>{children}</PublishContext.Provider>;
}
