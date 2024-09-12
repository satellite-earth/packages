import { IconButton, IconButtonProps } from '@chakra-ui/react';
import { To, useNavigate } from 'react-router-dom';

import { ChevronLeftIcon } from './icons';

export function BackButton({
	fallback,
	...props
}: { fallback?: string } & Omit<IconButtonProps, 'onClick' | 'children' | 'aria-label'>) {
	const navigate = useNavigate();

	return (
		<IconButton
			icon={<ChevronLeftIcon boxSize={6} />}
			aria-label="Back"
			variant="ghost"
			{...props}
			onClick={() => (history.state.idx === 0 ? navigate(fallback ?? '/') : navigate(-1))}
			hideFrom="lg"
		/>
	);
}
