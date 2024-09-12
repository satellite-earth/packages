import { logger } from '../helpers/debug';
import PersonalNode from '../classes/personal-node';
import PersonalNodeControlApi from '../classes/control-api';
import signingService from './signing';
import accountService from './account';
import relayPoolService from './relay-pool';

export const PERSONAL_NODE_STORAGE_KEY = 'private-node-url';
const log = logger.extend('private-node');

export function setPrivateNodeURL(url: string) {
	localStorage.setItem(PERSONAL_NODE_STORAGE_KEY, url);
	location.reload();
}
export function resetPrivateNodeURL() {
	localStorage.removeItem(PERSONAL_NODE_STORAGE_KEY);
	location.reload();
}

let personalNode: PersonalNode | null = null;

if (window.satellite) {
	log('Using URL from window.satellite');
	personalNode = new PersonalNode(await window.satellite.getLocalRelay());
} else if (localStorage.getItem(PERSONAL_NODE_STORAGE_KEY)) {
	try {
		log('Using URL from localStorage');
		personalNode = new PersonalNode(localStorage.getItem(PERSONAL_NODE_STORAGE_KEY)!);
	} catch (err) {
		log('Failed to create personal node, clearing storage');
		localStorage.removeItem(PERSONAL_NODE_STORAGE_KEY);
	}
} else {
	log('Unable to find private node URL');
}

if (personalNode) {
	// add the personal node to the relay pool and connect
	relayPoolService.relays.set(personalNode.url, personalNode);
	relayPoolService.requestConnect(personalNode);

	// automatically authenticate with personal node
	personalNode.onChallenge.subscribe(async () => {
		try {
			if (window.satellite) {
				await window.satellite.getAdminAuth().then((auth) => personalNode.authenticate(auth));
			}

			const savedAuth = localStorage.getItem('personal-node-auth');
			if (savedAuth) {
				if (savedAuth === 'nostr') {
					const account = accountService.current.value;
					if (!account) return;

					await personalNode.authenticate((draft) => signingService.requestSignature(draft, account));
				} else {
					await personalNode.authenticate(savedAuth);
				}
			}
		} catch (err) {
			console.log('Failed to authenticate with personal node', err);
			localStorage.removeItem('personal-node-auth');
		}
	});
}

const controlApi = personalNode ? new PersonalNodeControlApi(personalNode) : undefined;

if (import.meta.env.DEV) {
	// @ts-expect-error
	window.personalNode = personalNode;
	// @ts-expect-error
	window.controlApi = controlApi;
}

export { controlApi };
export default personalNode;
