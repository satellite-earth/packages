type DecryptionCacheAddContentMessage = ['CONTROL', 'DECRYPTION-CACHE', 'ADD-CONTENT', string, string];
type DecryptionCacheClearPubkeyMessage = ['CONTROL', 'DECRYPTION-CACHE', 'CLEAR-PUBKEY', string];
type DecryptionCacheClearMessage = ['CONTROL', 'DECRYPTION-CACHE', 'CLEAR'];
type DecryptionCacheRequestContent = ['CONTROL', 'DECRYPTION-CACHE', 'REQUEST', string[]];

type DecryptionCacheContentResponse = ['CONTROL', 'DECRYPTION-CACHE', 'CONTENT', string, string];
type DecryptionCacheContentEnd = ['CONTROL', 'DECRYPTION-CACHE', 'END'];

export type DecryptionCacheMessage =
	| DecryptionCacheAddContentMessage
	| DecryptionCacheClearPubkeyMessage
	| DecryptionCacheClearMessage
	| DecryptionCacheRequestContent;

export type DecryptionCacheResponse = DecryptionCacheContentResponse | DecryptionCacheContentEnd;
