import { PropsWithChildren, useState } from 'react';
import { Code, Flex, FormControl, FormLabel } from '@chakra-ui/react';

import QrCodeSvg from '../qr-code/qr-code-svg';
import CopyButton from '../copy-button';
import TextButton from './text-button';

export default function PanelItemString({
	children,
	label,
	value,
	qr,
}: PropsWithChildren<{
	label: string;
	value: string;
	qr?: boolean;
}>) {
	const [showQR, setShowQR] = useState(false);

	return (
		<FormControl>
			<FormLabel>{label}</FormLabel>
			<Code bg="none" userSelect="all" fontFamily="monospace" mr="auto" maxW="full">
				{value}
			</Code>
			<Flex gap="2" w="full" alignItems="center" wrap="wrap">
				<CopyButton variant="link" value={value} fontFamily="monospace" />
				{qr && (
					<TextButton variant="link" onClick={() => setShowQR((v) => !v)}>
						[qr]
					</TextButton>
				)}
			</Flex>
			{/* @ts-expect-error */}
			{showQR && <QrCodeSvg content={value} style={{ maxWidth: '3in', marginTop: '1em' }} />}
			{children}
		</FormControl>
	);
}
