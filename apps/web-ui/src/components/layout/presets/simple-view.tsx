import { Flex, FlexProps } from '@chakra-ui/react';

import SimpleHeader from './simple-header';

export default function SimpleView({ children, title, as, flush }: FlexProps & { flush?: boolean }) {
	return (
		<Flex as={as} flex={1} direction="column" overflow="hidden" pr="var(--safe-right)" pl="var(--safe-left)">
			<SimpleHeader title={title} />

			<Flex
				direction="column"
				overflowY="auto"
				px={flush ? 0 : '4'}
				pt={flush ? 0 : '4'}
				pb={flush ? 0 : 'max(1rem, var(--safe-bottom))'}
				gap="2"
				flexGrow={1}
			>
				{children}
			</Flex>
		</Flex>
	);
}
