import { kinds, NostrEvent } from 'nostr-tools';
import { Box, Card, CardBody, CardProps, Flex, Heading, Image, LinkBox, Tag, Text } from '@chakra-ui/react';
import {
	getArticleTitle,
	getArticleImage,
	getArticlePublishDate,
	getArticleSummary,
} from '@satellite-earth/core/helpers/nostr/long-form.js';

import useParamsProfilePointer from '../../hooks/use-params-pubkey-pointer';
import useTimelineLoader from '../../hooks/use-timeline-loader';
import IntersectionObserverProvider from '../../providers/local/intersection-observer';
import SimpleView from '../../components/layout/presets/simple-view';
import useTimelineCurserIntersectionCallback from '../../hooks/use-timeline-cursor-intersection-callback';
import useSubject from '../../hooks/use-subject';
import UserAvatar from '../../components/user/user-avatar';
import UserName from '../../components/user/user-name';
import Timestamp from '../../components/timestamp';
import personalNode from '../../services/personal-node';

function ArticleCard({ article, ...props }: { article: NostrEvent } & Omit<CardProps, 'children'>) {
	const title = getArticleTitle(article);
	const image = getArticleImage(article);
	const summary = getArticleSummary(article);

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
				<Heading size="md">{title}</Heading>
				<Text mb="2">{summary}</Text>
				{article.tags
					.filter((t) => t[0] === 't' && t[1])
					.map(([_, hashtag]: string[], i) => (
						<Tag key={hashtag + i} mr="2" mb="2">
							#{hashtag}
						</Tag>
					))}
			</CardBody>
		</Card>
	);
}

export default function UserArticlesView() {
	const pointer = useParamsProfilePointer();

	const timeline = useTimelineLoader(
		`${pointer.pubkey}-articles`,
		[{ kinds: [kinds.LongFormArticle], authors: [pointer.pubkey] }],
		[personalNode!],
	);

	const callback = useTimelineCurserIntersectionCallback(timeline);
	const articles = useSubject(timeline.timeline);

	return (
		<SimpleView title="Articles">
			<IntersectionObserverProvider callback={callback}>
				{articles.map((article) => (
					<ArticleCard key={article.id} article={article} />
				))}
			</IntersectionObserverProvider>
		</SimpleView>
	);
}
