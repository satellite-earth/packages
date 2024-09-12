type DirectMessageOpenConversation = ['CONTROL', 'DM', 'OPEN', string, string];
type DirectMessageCloseConversation = ['CONTROL', 'DM', 'CLOSE', string, string];

export type DirectMessageMessage = DirectMessageOpenConversation | DirectMessageCloseConversation;
// export type DirectMessageResponse = void;
