import { PropsWithChildren } from 'react';
import { QueryStoreProvider } from 'applesauce-react';

import { SigningProvider } from './signing-provider';
import PublishProvider from './publish-provider';
import BreakpointProvider from './breakpoint-provider';
import { queryStore } from '../../services/query-store';

export function GlobalProviders({ children }: PropsWithChildren) {
	return (
		<BreakpointProvider>
			<QueryStoreProvider store={queryStore}>
				<SigningProvider>
					<PublishProvider>{children}</PublishProvider>
				</SigningProvider>
			</QueryStoreProvider>
		</BreakpointProvider>
	);
}
