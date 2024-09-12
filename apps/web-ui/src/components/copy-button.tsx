import { useState } from 'react';

import { Button, ButtonProps } from '@chakra-ui/react';

export default function CopyButton({ value, ...props }: Omit<ButtonProps, 'children'> & { value: string }) {
	const [copied, setCopied] = useState(false);

	const copy = () => {
		if (navigator.clipboard?.writeText) {
			navigator.clipboard.writeText(value);
			setCopied(true);
			setTimeout(() => setCopied(false), 500);
		}
	};

	return (
		<Button onClick={copy} variant="link" {...props}>
			{copied ? '[copied]' : '[copy]'}
		</Button>
	);
}
