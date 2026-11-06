import jwt from 'jsonwebtoken';
import { env } from '../../config/env.js';

// Token creation and verification live here only, so refresh tokens can be added later
// without touching the rest of the auth code.
// The payload holds only the user id (`sub`).

export function signAuthToken(userId: string): string {
  return jwt.sign({}, env.JWT_SECRET, {
    subject: userId,
    expiresIn: env.JWT_EXPIRES_IN_SECONDS,
    algorithm: 'HS256',
  });
}

/** Returns the user id from a valid token. Throws a jsonwebtoken error if it is invalid or expired. */
export function verifyAuthToken(token: string): string {
  const payload = jwt.verify(token, env.JWT_SECRET, { algorithms: ['HS256'] });
  if (typeof payload === 'string' || typeof payload.sub !== 'string') {
    throw new jwt.JsonWebTokenError('invalid token payload');
  }
  return payload.sub;
}
