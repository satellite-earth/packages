import { forwardRef, useEffect } from 'react';
import { Input, InputProps, useForceUpdate } from '@chakra-ui/react';
import { Kind0ParsedContent, getUserDisplayName, parseKind0Event } from '@satellite-earth/core/helpers/nostr';

import personalNode from '../services/personal-node';
import replaceableEventsService from '../services/replaceable-events';

// NOTE: hacky way to load all kind 0 events
let profiles: Kind0ParsedContent[] = [];
function load() {
	return new Promise<void>((res) => {
		if (!personalNode || profiles.length > 0) return res();

		profiles = [];
		const sub = personalNode.subscribe([{ kinds: [0] }], {
			onevent: (event) => {
				profiles.push(parseKind0Event(event));
				replaceableEventsService.handleEvent(event);
			},
			oneose: () => {
				sub.close();
				res();
			},
		});
	});
}

export const PubkeyInput = forwardRef(({ ...props }: Omit<InputProps, 'type'>, ref) => {
	const update = useForceUpdate();
	useEffect(() => {
		load().then(update);
	}, []);

	return (
		<>
			<Input ref={ref} list="pubkey-suggestions" {...props} />
			<datalist id="pubkey-suggestions">
				{profiles.map((profile) => (
					<option key={profile.pubkey} value={profile.pubkey}>
						{getUserDisplayName(profile, profile.pubkey!)}
					</option>
				))}
			</datalist>
		</>
	);
});
