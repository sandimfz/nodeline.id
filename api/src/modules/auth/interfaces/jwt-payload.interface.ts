export interface JwtPayload {
  sub: string; // user id
  email: string;
  role: string;
  jti: string; // unique token id, used for refresh token tracking
}
