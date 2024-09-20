import { Flex, FlexProps, LinkBox, Switch } from '@chakra-ui/react';
import { Link as RouterLink } from 'react-router-dom';
import { nip19 } from 'nostr-tools';

import UserName from '../../../components/user/user-name';
import UserAvatar from '../../../components/user/user-avatar';
import HoverLinkOverlay from '../../../components/hover-link-overlay';

import { controlApi } from '../../../services/personal-node';
import useScrapperStatusReport from '../../../hooks/reports/use-scrapper-status-report';

export default function OverviewItem({
	pubkey,
	events,
	...props
}: Omit<FlexProps, 'children'> & { pubkey: string; events: number }) {
	const scrapper = useScrapperStatusReport();
	const scrapperActive = scrapper?.pubkeys.includes(pubkey) ?? false;

	return (
		<Flex as={LinkBox} justifyContent="space-between" alignItems="center" py="2" px="4" {...props}>
			<Flex alignItems="center" gap="3">
				<UserAvatar pubkey={pubkey} />
				<HoverLinkOverlay as={RouterLink} to={`/profile/${nip19.npubEncode(pubkey)}`}>
					<UserName pubkey={pubkey} />
				</HoverLinkOverlay>
				<Switch
					isChecked={scrapperActive}
					onChange={() =>
						controlApi?.send(['CONTROL', 'SCRAPPER', scrapperActive ? 'REMOVE-PUBKEY' : 'ADD-PUBKEY', pubkey])
					}
					isDisabled={!scrapper}
				></Switch>
			</Flex>
			<div>{events} events</div>
		</Flex>
	);
}
