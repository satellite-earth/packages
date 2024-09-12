import { forwardRef, memo } from 'react';
import { Avatar, AvatarProps } from '@chakra-ui/react';
import { Kind0ParsedContent, getUserDisplayName } from '@satellite-earth/core/helpers/nostr';

import useUserMetadata from '../../hooks/use-user-metadata';

export type UserAvatarProps = Omit<MetadataAvatarProps, 'pubkey' | 'metadata'> & {
	pubkey: string;
	relay?: string;
};
export const UserAvatar = forwardRef<HTMLDivElement, UserAvatarProps>(({ pubkey, noProxy, relay, ...props }, ref) => {
	const metadata = useUserMetadata(pubkey, relay ? [relay] : undefined);
	return <MetadataAvatar pubkey={pubkey} metadata={metadata} noProxy={noProxy} ref={ref} {...props} />;
});
UserAvatar.displayName = 'UserAvatar';

export type MetadataAvatarProps = Omit<AvatarProps, 'src'> & {
	metadata?: Kind0ParsedContent;
	pubkey?: string;
	noProxy?: boolean;
};
export const MetadataAvatar = forwardRef<HTMLDivElement, MetadataAvatarProps>(
	({ pubkey, metadata, noProxy, ...props }, ref) => {
		const picture = metadata?.picture || metadata?.image;

		return (
			<Avatar src={picture} overflow="hidden" title={getUserDisplayName(metadata, pubkey ?? '')} ref={ref} {...props} />
		);
	},
);
UserAvatar.displayName = 'UserAvatar';

export default memo(UserAvatar);
