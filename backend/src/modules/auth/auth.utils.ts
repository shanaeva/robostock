import type { CookieOptions, Response } from 'express';
import { ACCESS_TTL_SECONDS } from './auth.constants.js';
import type { AuthService } from './auth.service.js';

export function cookieOptions(nodeEnv: string): CookieOptions {
  return {
    httpOnly: true,
    secure: nodeEnv === 'production',
    sameSite: nodeEnv === 'production' ? 'strict' : 'lax',
    path: '/',
  };
}

export function setCredentials(
  response: Response,
  result: Awaited<ReturnType<AuthService['login']>>,
  rememberMe: boolean,
  nodeEnv: string,
  sessionExpiresAt?: Date,
): void {
  const options = cookieOptions(nodeEnv);
  response.cookie('access_token', result.accessToken, {
    ...options,
    ...(rememberMe ? { maxAge: ACCESS_TTL_SECONDS * 1000 } : {}),
  });
  response.cookie('refresh_token', result.refreshToken, {
    ...options,
    ...(rememberMe && sessionExpiresAt ? { expires: sessionExpiresAt } : {}),
  });
}

export function clearCredentials(response: Response, nodeEnv: string): void {
  const options = cookieOptions(nodeEnv);
  response.clearCookie('access_token', options);
  response.clearCookie('refresh_token', options);
}
