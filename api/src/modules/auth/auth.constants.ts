export const JWT_ACCESS_EXPIRES_IN = '15m'; // access token: short-lived
export const JWT_REFRESH_EXPIRES_IN = '30d'; // refresh token: long, rotated on each use

// Refresh token rotation window: an already-rotated token presented again
// within this time is treated as theft → revoke all sessions.
