import { NostrEvent } from 'nostr-tools';

type RemoteAuthSubscribe = ['CONTROL', 'REMOTE-AUTH', 'SUBSCRIBE'];
type RemoteAuthUnsubscribe = ['CONTROL', 'REMOTE-AUTH', 'UNSUBSCRIBE'];
type RemoteAuthAuthenticate = ['CONTROL', 'REMOTE-AUTH', 'AUTHENTICATE', NostrEvent];

// relay, challenge, authenticated
type RemoteAuthStatus = ['CONTROL', 'REMOTE-AUTH', 'STATUS', string, string, boolean];

export type RemoteAuthMessage = RemoteAuthSubscribe | RemoteAuthUnsubscribe | RemoteAuthAuthenticate;
export type RemoteAuthResponse = RemoteAuthStatus;
