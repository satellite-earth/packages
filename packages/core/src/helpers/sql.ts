export function mapParams(params: any[]) {
	return `(${params.map(() => `?`).join(', ')})`;
}
