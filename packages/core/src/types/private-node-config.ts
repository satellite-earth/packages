export type PrivateNodeConfig = {
	owner?: string;
	name: string;
	description: string;

	/**
	 * Whether the node should require NIP-42 auth to read
	 * Desktop: false by default
	 * Hosted: true by default
	 */
	requireReadAuth: boolean;

	/**
	 * various address that this node can be reached from
	 * Desktop: default to empty
	 * Hosted: default to public facing URLs
	 */
	publicAddresses: string[];

	/** @deprecated this should probably be moved to desktop */
	autoListen: boolean;
	/** @deprecated this should always be enabled */
	logsEnabled: boolean;

	runScrapperOnBoot: boolean;
	runReceiverOnBoot: boolean;

	// hyper
	hyperEnabled: boolean;

	/** whether to allow connection to .hyper relays if available */
	enableHyperConnections: boolean;
	/** whether to allow connection to .onion relays if available */
	enableTorConnections: boolean;
	/** whether to allow connection to .i2p relays if available */
	enableI2PConnections: boolean;

	/** makes all websocket and http traffic use the tor proxy */
	routeAllTrafficThroughTor: boolean;

	// VAPID keys
	vapidPublicKey?: string;

	// fallback notification email, this is only used for ntfy notifications
	notificationEmail?: string;
};
