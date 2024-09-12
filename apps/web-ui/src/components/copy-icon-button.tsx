import { useState } from 'react';
import { IconButton, IconButtonProps, useToast } from '@chakra-ui/react';

import Check from './icons/components/check';
import Clipboard from './icons/components/clipboard';

type CopyIconButtonProps = Omit<IconButtonProps, 'icon' | 'value'> & {
	value: string | undefined | (() => string);
	icon?: IconButtonProps['icon'];
};

export const CopyIconButton = ({ value, icon, ...props }: CopyIconButtonProps) => {
	const toast = useToast();
	const [copied, setCopied] = useState(false);

	return (
		<IconButton
			icon={copied ? <Check boxSize="1.5em" /> : icon || <Clipboard boxSize="1.2em" />}
			onClick={() => {
				const v: string | undefined = typeof value === 'function' ? value() : value;

				if (v && navigator.clipboard && !copied) {
					navigator.clipboard.writeText(v);
					setCopied(true);
					setTimeout(() => setCopied(false), 2000);
				} else toast({ description: v, isClosable: true, duration: null });
			}}
			{...props}
		/>
	);
};
