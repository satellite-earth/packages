import { IconButton, IconButtonProps, useColorMode } from '@chakra-ui/react';
import Moon01 from './icons/components/moon-01';
import Sun from './icons/components/sun';

export default function ColorModeButton({ ...props }: Omit<IconButtonProps, 'aria-label' | 'icon'>) {
	const { colorMode, toggleColorMode } = useColorMode();

	return (
		<IconButton
			aria-label="Color Mode"
			title="Color Mode"
			onClick={toggleColorMode}
			icon={colorMode === 'light' ? <Moon01 boxSize={6} /> : <Sun boxSize={6} />}
		/>
	);
}
