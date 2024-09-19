import { useMemo } from 'react';
import { Card, CardBody, CardFooter, CardHeader, LinkBox, Text } from '@chakra-ui/react';
import { nip10, nip19, NostrEvent } from 'nostr-tools';

import UserAvatar from '../../../components/user/user-avatar';
import UserName from '../../../components/user/user-name';
import Timestamp from '../../../components/timestamp';
import { ChevronRightIcon } from '../../../components/icons';
import HoverLinkOverlay from '../../../components/hover-link-overlay';
import ReverseLeft from '../../../components/icons/components/reverse-left';
import ThumbsUp from '../../../components/icons/components/thumbs-up';
import Repeat01 from '../../../components/icons/components/repeat-01';

export default function NoteCard({
	event,
	reactions,
	replies,
	shares,
}: {
	event: NostrEvent;
	replies?: number;
	reactions?: number;
	shares?: number;
}) {
	const refs = useMemo(() => nip10.parse(event), [event]);

	const showFooter = reactions || replies || shares;

	return (
		<Card key={event.id} size="sm" as={LinkBox}>
			<CardHeader alignItems="center" display="flex" gap="2">
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
			{showFooter !== undefined && (
				<CardFooter display="flex" gap="4" pt="0">
					{reactions !== undefined && (
						<Text>
							<ThumbsUp /> {reactions}
						</Text>
					)}
					{replies !== undefined && (
						<Text>
							<ReverseLeft /> {replies}
						</Text>
					)}
					{shares !== undefined && (
						<Text>
							<Repeat01 /> {shares}
						</Text>
					)}
				</CardFooter>
			)}
			<HoverLinkOverlay href={`https://nostrapp.link/${nip19.neventEncode(event)}`} target="_blank" />
		</Card>
	);
}
