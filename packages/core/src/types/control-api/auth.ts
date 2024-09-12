type AuthCodeMessage = ['CONTROL', 'AUTH', 'CODE', string];
type AuthSuccessResponse = ['CONTROL', 'AUTH', 'SUCCESS'];
type AuthInvalidResponse = ['CONTROL', 'AUTH', 'INVALID', string];

export type AuthMessage = AuthCodeMessage;
export type AuthResponse = AuthSuccessResponse | AuthInvalidResponse;
