import { Alert, AlertDescription, AlertIcon, AlertTitle } from '@chakra-ui/react';
import React, { memo } from 'react';
import { ErrorBoundary as ErrorBoundaryHelper, FallbackProps } from 'react-error-boundary';

export function ErrorFallback({ error }: Partial<FallbackProps>) {
	return (
		<Alert status="error">
			<AlertIcon />
			<AlertTitle>Something went wrong</AlertTitle>
			<AlertDescription>{error?.message}</AlertDescription>
		</Alert>
	);
}

const ErrorBoundary = memo(({ children, ...props }: { children: React.ReactNode }) => (
	<ErrorBoundaryHelper FallbackComponent={ErrorFallback} {...props}>
		{children}
	</ErrorBoundaryHelper>
));

export default ErrorBoundary;
