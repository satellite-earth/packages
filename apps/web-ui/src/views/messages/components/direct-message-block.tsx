import { ReactNode, memo, useCallback } from 'react';
import { NostrEvent } from 'nostr-tools';

import MessageBlock, { MessageBlockProps } from '../../../components/message/message-block';
import DecryptPlaceholder from './decrypt-placeholder';
import { Box } from '@chakra-ui/react';
// import DirectMessageContent from './direct-message-content';

function DirectMessageBlock({ ...props }: Omit<MessageBlockProps, 'renderContent'>) {
	const renderContent = useCallback(
		(message: NostrEvent, buttons: ReactNode | null) => (
			<DecryptPlaceholder message={message} variant="link" py="4" px="6rem">
				{(plaintext) => (
					<Box whiteSpace="pre-wrap">
						{buttons}
						{plaintext}
					</Box>
					// <DirectMessageContent event={message} text={plaintext} display="inline">
					// 	{buttons}
					// </DirectMessageContent>
				)}
			</DecryptPlaceholder>
		),
		[],
	);

	return <MessageBlock renderContent={renderContent} {...props} />;
}

export default memo(DirectMessageBlock);
