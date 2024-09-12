import { useState } from 'react';
import { Button, ButtonProps } from '@chakra-ui/react';
import { isPubkeyInList, listAddPerson, listRemovePerson } from '@satellite-earth/core/helpers/nostr/lists.js';
import { EventTemplate, kinds } from 'nostr-tools';
import dayjs from 'dayjs';

import { usePublishEvent } from '../../../providers/global/publish-provider';
import useCurrentAccount from '../../../hooks/use-current-account';
import { useSigningContext } from '../../../providers/global/signing-provider';
import useUserContactList from '../../../hooks/use-user-contact-list';
import personalNode from '../../../services/personal-node';
import useAsyncErrorHandler from '../../../hooks/use-async-error-handler';

function emptyContactList(): EventTemplate {
	return {
		created_at: dayjs().unix(),
		content: '',
		tags: [],
		kind: kinds.Contacts,
	};
}

export default function UserFollowButton({
	pubkey,
	...props
}: { pubkey: string } & Omit<ButtonProps, 'onClick' | 'isLoading' | 'isDisabled'>) {
	const publish = usePublishEvent();
	const account = useCurrentAccount();
	const { requestSignature } = useSigningContext();
	const contacts = useUserContactList(account?.pubkey, undefined, { alwaysRequest: true });

	const isFollowing = isPubkeyInList(contacts, pubkey);
	const isDisabled = !contacts || !personalNode || !!account?.readonly;

	const [loading, setLoading] = useState(false);

	const handleFollow = useAsyncErrorHandler(async () => {
		if (!personalNode) return;

		setLoading(true);
		const draft = listAddPerson(contacts || emptyContactList(), pubkey);
		await publish(draft, personalNode);
		setLoading(false);
	}, [contacts, requestSignature]);

	const handleUnfollow = useAsyncErrorHandler(async () => {
		if (!personalNode) return;

		setLoading(true);
		const draft = listRemovePerson(contacts || emptyContactList(), pubkey);
		await publish(draft, personalNode);
		setLoading(false);
	}, [contacts, requestSignature]);

	if (isFollowing) {
		return (
			<Button onClick={handleUnfollow} colorScheme="red" isDisabled={isDisabled} isLoading={loading} {...props}>
				Unfollow
			</Button>
		);
	}

	return (
		<>
			<Button onClick={handleFollow} colorScheme="green" isDisabled={isDisabled} isLoading={loading} {...props}>
				Follow
			</Button>
		</>
	);
}
