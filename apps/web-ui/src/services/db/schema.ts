export interface SchemaV1 {
	settings: {
		key: string;
		value: any;
	};
	accounts: {
		key: string;
		value: {
			pubkey: string;
		};
	};
	dnsIdentifiers: {
		key: string;
		value: {
			name: string;
			domain: string;
			pubkey: string;
			relays: string[];
			updated: number;
		};
		indexes: {
			name: string;
			domain: string;
			pubkey: string;
			updated: number;
		};
	};
}
