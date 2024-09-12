import WebSocket from 'ws';
import { useWebSocketImplementation } from 'nostr-tools/relay';

// @ts-expect-error
global.WebSocket = WebSocket;
useWebSocketImplementation(WebSocket);
