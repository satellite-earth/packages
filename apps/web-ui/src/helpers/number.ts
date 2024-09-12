export const formatDataSize = (n: number, options: { kBMin?: number } = {}) => {
	if (options.kBMin && n < 1000) {
		return '0 KB';
	}

	if (n < 1000) {
		return `${n} B`;
	} else if (n < 1000000) {
		return `${Math.round(n / 1000)} KB`;
	} else if (n < 1000000000) {
		return `${(n / 1000000).toFixed(n > 100000000 ? 0 : 1)} MB`;
	} else {
		return `${(n / 1000000000).toFixed(1)} GB`;
	}
};
