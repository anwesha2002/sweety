import type { RequestHandler } from 'express';
import { AUTH_COOKIE_NAME } from '../modules/auth/auth.cookie.js';
import { verifyAuthToken } from '../modules/auth/auth.token.js';
import { toUserDto } from '../modules/users/user.dto.js';
import { findUserById } from '../modules/users/user.repository.js';
import { ApiError } from '../utils/ApiError.js';

const LOGIN_REQUIRED = 'Please log in to continue.';

/**
 * Reads the auth cookie, verifies the JWT and loads the user into `req.user`.
 * Every protected query must use `req.user.id`, never a user id sent by the client.
 */
export const requireAuth: RequestHandler = async (req, _res, next) => {
  const token: unknown = req.cookies?.[AUTH_COOKIE_NAME];
  if (typeof token !== 'string' || token === '') {
    throw new ApiError(401, LOGIN_REQUIRED);
  }

  // Invalid/expired tokens throw jsonwebtoken errors, which the error handler turns into 401.
  const userId = verifyAuthToken(token);

  const user = await findUserById(userId);
  if (!user) {
    throw new ApiError(401, LOGIN_REQUIRED);
  }

  req.user = toUserDto(user);
  next();
};
