import { bech32 } from '@scure/base';
import { NostrEvent, nip57, utils } from 'nostr-tools';
import { type Kind0ParsedContent } from '@satellite-earth/core/helpers/nostr/profile.js';
import { ParsedInvoice, parsePaymentRequest } from '../bolt11';

// based on https://github.com/nbd-wtf/nostr-tools/blob/master/nip57.ts
export async function getZapEndpoint(metadata: Kind0ParsedContent): Promise<null | string> {
	try {
		let lnurl: string = '';
		let { lud06, lud16 } = metadata;
		if (lud06) {
			let { words } = bech32.decode(lud06, 1000);
			let data = bech32.fromWords(words);
			lnurl = utils.utf8Decoder.decode(data);
		} else if (lud16) {
			let [name, domain] = lud16.split('@');
			lnurl = `https://${domain}/.well-known/lnurlp/${name}`;
		} else {
			return null;
		}

		let res = await fetch(lnurl);
		let body = await res.json();

		if (body.allowsNostr && body.nostrPubkey) {
			return body.callback;
		}
	} catch (err) {
		/*-*/
	}

	return null;
}

export type ParsedZap = {
	receipt: NostrEvent;
	request: NostrEvent;
	payment: ParsedInvoice;
	eventId?: string;
};

export function parseZapEvent(event: NostrEvent): ParsedZap {
	const zapRequestStr = event.tags.find(([t]) => t === 'description')?.[1];
	if (!zapRequestStr) throw new Error('no description tag');

	const bolt11 = event.tags.find((t) => t[0] === 'bolt11')?.[1];
	if (!bolt11) throw new Error('missing bolt11 invoice');

	const error = nip57.validateZapRequest(zapRequestStr);
	if (error) throw new Error(error);

	const request = JSON.parse(zapRequestStr) as NostrEvent;
	const payment = parsePaymentRequest(bolt11);

	return {
		receipt: event,
		request,
		payment,
	};
}
