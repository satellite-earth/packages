import { AuthMessage, AuthResponse } from './auth.js';
import { ConfigMessage, ConfigResponse } from './config.js';
import { DatabaseMessage, DatabaseResponse } from './database.js';
import { DecryptionCacheMessage, DecryptionCacheResponse } from './decryption-cache.js';
import { DirectMessageMessage } from './direct-messages.js';
import { NotificationsMessage, NotificationsResponse } from './notifications.js';
import { ReceiverMessage } from './receiver.js';
import { RemoteAuthMessage, RemoteAuthResponse } from './remote-auth.js';
import { ReportsMessage, ReportsResponse } from './reports.js';
import { LogsMessage } from './logs.js';
import { ScrapperMessage } from './scrapper.js';

export type ControlMessage =
	| AuthMessage
	| ConfigMessage
	| DatabaseMessage
	| ReceiverMessage
	| ScrapperMessage
	| DirectMessageMessage
	| NotificationsMessage
	| RemoteAuthMessage
	| ReportsMessage
	| DecryptionCacheMessage
	| LogsMessage;
export type ControlResponse =
	| AuthResponse
	| ConfigResponse
	| DatabaseResponse
	| NotificationsResponse
	| RemoteAuthResponse
	| ReportsResponse
	| DecryptionCacheResponse;
