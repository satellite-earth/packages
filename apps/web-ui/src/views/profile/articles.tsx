import { useState } from 'react';
import { kinds } from 'nostr-tools';
import { Button, ButtonGroup } from '@chakra-ui/react';

import useParamsProfilePointer from '../../hooks/use-params-pubkey-pointer';
import SimpleView from '../../components/layout/presets/simple-view';
import ArticleCard from './components/article-card';
import useEventsSummaryReport from '../../hooks/reports/use-events-summary-report';

export default function UserArticlesView() {
	const pointer = useParamsProfilePointer();

	const [order, setOrder] = useState<'interactions' | 'created_at'>('created_at');

	const articles = useEventsSummaryReport(`${pointer.pubkey}-articles`, {
		pubkey: pointer.pubkey,
		order,
		kind: kinds.LongFormArticle,
		limit: 20,
	});

	return (
		<SimpleView title="Articles">
			<ButtonGroup size="sm">
				<Button onClick={() => setOrder('interactions')} colorScheme={order === 'interactions' ? 'brand' : undefined}>
					Popular
				</Button>
				<Button onClick={() => setOrder('created_at')} colorScheme={order === 'created_at' ? 'brand' : undefined}>
					Latest
				</Button>
			</ButtonGroup>
			{articles?.map(({ event: article, replies, shares, reactions }) => (
				<ArticleCard key={article.id} article={article} replies={replies} shares={shares} reactions={reactions} />
			))}
		</SimpleView>
	);
}
