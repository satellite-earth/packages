import { PropsWithChildren } from 'react';

import { SigningProvider } from './signing-provider';
import PublishProvider from './publish-provider';
import BreakpointProvider from './breakpoint-provider';

export function GlobalProviders({ children }: PropsWithChildren) {
	return (
		<BreakpointProvider>
			<SigningProvider>
				<PublishProvider>{children}</PublishProvider>
			</SigningProvider>
		</BreakpointProvider>
	);
}
