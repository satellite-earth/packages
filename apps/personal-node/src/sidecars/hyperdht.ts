import HyperDHT from 'hyperdht';
import { logger } from '../logger.js';

const log = logger.extend('HyperDHT');
let node: HyperDHT | undefined;

export function getOrCreateNode() {
	if (node) return node;

	log('Creating HyperDHT Node');
	return (node = new HyperDHT());
}

export function destroyNode() {
	if (node) {
		node.destroy();
		node = undefined;
	}
}
