export function base64ToBlob(base64: string, contentType = '') {
	const encoded = base64.split(',')[1] || base64;

	// Decode base64 string
	const byteCharacters = atob(encoded);

	// Create Uint8Array
	const byteArrays = [];
	for (let offset = 0; offset < byteCharacters.length; offset += 512) {
		const slice = byteCharacters.slice(offset, offset + 512);
		const byteNumbers = new Array(slice.length);
		for (let i = 0; i < slice.length; i++) {
			byteNumbers[i] = slice.charCodeAt(i);
		}
		const byteArray = new Uint8Array(byteNumbers);
		byteArrays.push(byteArray);
	}

	// Create Blob
	const blob = new Blob(byteArrays, { type: contentType });
	return blob;
}
