type ScrapperStart = ['CONTROL', 'SCRAPPER', 'START'];
type ScrapperStop = ['CONTROL', 'SCRAPPER', 'STOP'];
type ScrapperAddPubkey = ['CONTROL', 'SCRAPPER', 'ADD-PUBKEY', string];
type ScrapperRemovePubkey = ['CONTROL', 'SCRAPPER', 'REMOVE-PUBKEY', string];

export type ScrapperMessage = ScrapperStart | ScrapperStop | ScrapperAddPubkey | ScrapperRemovePubkey;
