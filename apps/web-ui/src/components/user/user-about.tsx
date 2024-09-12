import { Text, TextProps } from '@chakra-ui/react';

import useUserMetadata from '../../hooks/use-user-metadata';

export default function UserAbout({ pubkey, as, ...props }: Omit<TextProps, 'children'> & { pubkey: string }) {
	const metadata = useUserMetadata(pubkey);

	if (!metadata || !metadata.about) return null;

	return (
		<Text as={as} whiteSpace="pre-wrap" {...props}>
			{metadata.about}
		</Text>
	);
}
