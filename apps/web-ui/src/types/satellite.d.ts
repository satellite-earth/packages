interface Window {
	satellite?: {
		getLocalRelay: () => Promise<string>;
		getAdminAuth: () => Promise<string>;
		newIdentity: () => Promise<void>;
		addIdentity: (seckey: string) => Promise<void>;
		removeIdentity: (pubkey: string) => Promise<void>;
	};
}
