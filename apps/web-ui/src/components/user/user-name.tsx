import { Text, TextProps } from '@chakra-ui/react';
import { getUserDisplayName } from '@satellite-earth/core/helpers/nostr';

import useUserMetadata from '../../hooks/use-user-metadata';

export default function UserName({ pubkey, as, ...props }: Omit<TextProps, 'children'> & { pubkey: string }) {
	const metadata = useUserMetadata(pubkey);

	return (
		<Text as={as || 'span'} whiteSpace="nowrap" fontWeight="bold" {...props}>
			{getUserDisplayName(metadata, pubkey)}
		</Text>
	);
}
