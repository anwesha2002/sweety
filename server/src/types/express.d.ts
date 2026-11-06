import type { UserDto } from '../modules/users/user.dto.js';

declare global {
  namespace Express {
    interface Request {
      /** Set by requireAuth on protected routes. */
      user?: UserDto;
    }
  }
}
