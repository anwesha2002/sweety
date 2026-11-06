import type { User } from '../../db/schema.js';

/** The only user shape that ever leaves the API. It never contains passwordHash. */
export interface UserDto {
  id: string;
  name: string;
  email: string;
  createdAt: Date;
}

export function toUserDto(user: User): UserDto {
  return { id: user.id, name: user.name, email: user.email, createdAt: user.createdAt };
}
