import { IsString } from 'class-validator';

/**
 * Refresh token is normally read from the httpOnly cookie, but we accept it
 * in the body too so the endpoint works for clients that can't store cookies
 * (e.g. server-to-server tests, mobile).
 */
export class RefreshTokenDto {
  @IsString()
  refreshToken?: string;
}
