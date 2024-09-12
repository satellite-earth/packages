import React, { useMemo } from 'react';
import { Image, ImageProps } from '@chakra-ui/react';

import { useRelayInfo } from '../hooks/use-relay-info';

export const RelayFavicon = React.memo(
	({
		relay,
		...props
	}: Omit<ImageProps, 'src'> & {
		relay: string;
	}) => {
		const { info } = useRelayInfo(relay);

		const url = useMemo(() => {
			if (info?.icon) return info.icon;

			const url = new URL(relay);
			url.protocol = url.protocol === 'ws:' ? 'http:' : 'https:';
			url.pathname = '/favicon.ico';
			return url.toString();
		}, [relay, info]);

		return <Image src={url} {...props} />;
	},
);
RelayFavicon.displayName = 'RelayFavicon';
