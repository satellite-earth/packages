import { useMemo } from 'react';
import { Card, CardBody, CardHeader, LinkBox, Text } from '@chakra-ui/react';
import { nip10, nip19, NostrEvent } from 'nostr-tools';

import UserAvatar from '../../../components/user/user-avatar';
import UserName from '../../../components/user/user-name';
import Timestamp from '../../../components/timestamp';
import { ChevronRightIcon } from '../../../components/icons';
import HoverLinkOverlay from '../../../components/hover-link-overlay';
import ReverseLeft from '../../../components/icons/components/reverse-left';

export default function NoteCard({ event }: { event: NostrEvent }) {
	const refs = useMemo(() => nip10.parse(event), [event]);

	return (
		<Card key={event.id} as={LinkBox}>
			<CardHeader alignItems="center" display="flex" gap="2" pb="2">
				<UserAvatar pubkey={event.pubkey} size="sm" />
				<UserName pubkey={event.pubkey} />
				<Timestamp timestamp={event.created_at} />
				{refs.reply ? <ReverseLeft /> : null}
				<ChevronRightIcon boxSize={6} ml="auto" />
			</CardHeader>
			<CardBody pt="0" display="flex">
				<Text noOfLines={3} whiteSpace="pre-wrap">
					{event.content}
				</Text>
			</CardBody>
			<HoverLinkOverlay href={`https://nostrapp.link/${nip19.neventEncode(event)}`} target="_blank" />
		</Card>
	);
}
