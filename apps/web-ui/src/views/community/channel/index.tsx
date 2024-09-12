import { useParams } from 'react-router-dom';
import TextChannelView from './text-channel';
import { CHANNEL_KIND } from '@satellite-earth/core/helpers/nostr';

import useReplaceableEvent from '../../../hooks/use-replaceable-event';
import { useCurrentCommunity } from '../../../providers/local/community-provider';

export default function ChannelView() {
	const { id } = useParams();
	const { relay, community } = useCurrentCommunity();
	const channel = useReplaceableEvent({ kind: CHANNEL_KIND, identifier: id, pubkey: community.pubkey }, [relay]);

	if (id) return <TextChannelView channelId={id} channel={channel} />;
	return <h1>Cant find group</h1>;
}
