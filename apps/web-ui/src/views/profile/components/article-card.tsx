import { Box, Card, CardBody, CardFooter, CardProps, Flex, Heading, Image, LinkBox, Tag, Text } from '@chakra-ui/react';
import {
	getArticleImage,
	getArticlePublishDate,
	getArticleSummary,
	getArticleTitle,
} from '@satellite-earth/core/helpers/nostr/long-form.js';
import { NostrEvent } from 'nostr-tools';
import { getSharableEventAddress } from '@satellite-earth/core/helpers/nostr/nip19.js';

import UserName from '../../../components/user/user-name';
import UserAvatar from '../../../components/user/user-avatar';
import Timestamp from '../../../components/timestamp';
import HoverLinkOverlay from '../../../components/hover-link-overlay';
import ThumbsUp from '../../../components/icons/components/thumbs-up';
import ReverseLeft from '../../../components/icons/components/reverse-left';
import Repeat01 from '../../../components/icons/components/repeat-01';

export default function ArticleCard({
	article,
	replies,
	reactions,
	shares,
	...props
}: { article: NostrEvent; replies?: number; reactions?: number; shares?: number } & Omit<CardProps, 'children'>) {
	const title = getArticleTitle(article);
	const image = getArticleImage(article);
	const summary = getArticleSummary(article);

	const showFooter = reactions || replies || shares;

	return (
		<Card as={LinkBox} size="sm" cursor="pointer" {...props}>
			{image && (
				<Box
					backgroundImage={image}
					w="full"
					aspectRatio={3 / 1}
					hideFrom="md"
					backgroundRepeat="no-repeat"
					backgroundPosition="center"
					backgroundSize="cover"
				/>
			)}
			<CardBody>
				{image && (
					<Image src={image} alt={title} maxW="3in" maxH="2in" float="right" borderRadius="md" ml="2" hideBelow="md" />
				)}
				<Flex gap="2" alignItems="center" mb="2">
					<UserAvatar pubkey={article.pubkey} size="sm" />
					<UserName pubkey={article.pubkey} fontWeight="bold" isTruncated />
					<Timestamp timestamp={getArticlePublishDate(article) ?? article.created_at} />
				</Flex>
				<Heading size="md">
					<HoverLinkOverlay href={`https://nostrapp.link/${getSharableEventAddress(article)}`} target="_blank">
						{title}
					</HoverLinkOverlay>
				</Heading>
				<Text mb="2">{summary}</Text>
				{article.tags
					.filter((t) => t[0] === 't' && t[1])
					.map(([_, hashtag]: string[], i) => (
						<Tag key={hashtag + i} mr="2" mb="2">
							#{hashtag}
						</Tag>
					))}
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
		</Card>
	);
}
