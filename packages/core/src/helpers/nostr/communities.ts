import { NostrEvent } from 'nostr-tools';

const tagValue = (e: NostrEvent, k: string) => e.tags.find((t) => t[0] === k)?.[1];
export function getCommunityName(definition: NostrEvent) {
	return tagValue(definition, 'name');
}
export function getCommunityBanner(definition: NostrEvent) {
	return tagValue(definition, 'banner');
}
export function getCommunityImage(definition: NostrEvent) {
	return tagValue(definition, 'image');
}
export function getCommunityRelay(definition: NostrEvent) {
	return tagValue(definition, 'r');
}
export function getCommunityCDN(definition: NostrEvent) {
	return tagValue(definition, 'cdn');
}
