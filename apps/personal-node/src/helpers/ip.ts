import os from 'node:os';

export function getIPAddresses() {
	var ifaces = os.networkInterfaces();
	var addresses: string[] = [];

	for (const [name, info] of Object.entries(ifaces)) {
		if (!info) continue;

		for (const interfaceInfo of info) {
			// skip over internal (i.e. 127.0.0.1) and non-ipv4 addresses
			if (interfaceInfo.internal) continue;

			addresses.push(interfaceInfo.address);
		}
	}

	return addresses;
}
