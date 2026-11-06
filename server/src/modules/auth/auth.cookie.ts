import type { CookieOptions, Response } from 'express';
import { env } from '../../config/env.js';

export const AUTH_COOKIE_NAME = 'token';

// httpOnly keeps the token away from JavaScript; the token is never put in a response body.
// maxAge matches the JWT lifetime. clearCookie must use the same path/sameSite/secure options.
const baseOptions: CookieOptions = {
  httpOnly: true,
  sameSite: 'lax',
  secure: env.isProduction,
  path: '/',
};

export function setAuthCookie(res: Response, token: string): void {
  res.cookie(AUTH_COOKIE_NAME, token, {
    ...baseOptions,
    maxAge: env.JWT_EXPIRES_IN_SECONDS * 1000,
  });
}

export function clearAuthCookie(res: Response): void {
  res.clearCookie(AUTH_COOKIE_NAME, baseOptions);
}
