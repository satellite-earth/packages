import { Flex, FlexProps } from '@chakra-ui/react';
import { FixedSizeList, ListChildComponentProps } from 'react-window';
import AutoSizer from 'react-virtualized-auto-sizer';
import { ReportResults } from '@satellite-earth/core/types';

import useOverviewReport from '../../../hooks/reports/use-overview-report';
import OverviewItem from './overview-item';
import SimpleView from '../../../components/layout/presets/simple-view';

function Row({ index, style, data }: ListChildComponentProps<ReportResults['OVERVIEW'][]>) {
	const item = data[index];

	return <OverviewItem pubkey={item.pubkey} events={item.events} style={style} />;
}

export default function OverviewList({ ...props }: Omit<FlexProps, 'children'>) {
	const overview = useOverviewReport();

	return (
		<SimpleView title="Network" flush>
			<Flex h="full" flex={1} overflow="hidden" {...props}>
				<AutoSizer>
					{({ width, height }) => (
						<FixedSizeList
							height={height}
							width={width}
							itemData={overview ?? []}
							itemCount={overview?.length ?? 0}
							itemKey={(i, data) => data[i].pubkey}
							itemSize={64}
						>
							{Row}
						</FixedSizeList>
					)}
				</AutoSizer>
			</Flex>
		</SimpleView>
	);
}
