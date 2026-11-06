import bcrypt from 'bcrypt';
import { env } from '../../config/env.js';
import { ApiError } from '../../utils/ApiError.js';
import { isUniqueViolation } from '../../utils/dbErrors.js';
import { toUserDto, type UserDto } from '../users/user.dto.js';
import { createUser, findUserByEmail } from '../users/user.repository.js';
import type { LoginInput, RegisterInput } from './auth.schemas.js';
import { signAuthToken } from './auth.token.js';

export interface AuthResult {
  user: UserDto;
  token: string;
}

// Compared against when the email is unknown, so a failed login takes about the same time
// whether or not the account exists.
const DUMMY_PASSWORD_HASH = bcrypt.hashSync('not-a-real-password', env.BCRYPT_ROUNDS);

const INVALID_CREDENTIALS = 'Invalid email or password.';
const EMAIL_TAKEN = 'An account with this email already exists.';

function emailTakenError(): ApiError {
  return new ApiError(409, EMAIL_TAKEN, [{ field: 'email', message: EMAIL_TAKEN }]);
}

export async function registerUser(input: RegisterInput): Promise<AuthResult> {
  if (await findUserByEmail(input.email)) {
    throw emailTakenError();
  }

  const passwordHash = await bcrypt.hash(input.password, env.BCRYPT_ROUNDS);

  try {
    const user = await createUser({ name: input.name, email: input.email, passwordHash });
    return { user: toUserDto(user), token: signAuthToken(user.id) };
  } catch (error) {
    // Two requests with the same email can pass the check above at the same time;
    // the unique index catches the second one.
    if (isUniqueViolation(error)) {
      throw emailTakenError();
    }
    throw error;
  }
}

export async function loginUser(input: LoginInput): Promise<AuthResult> {
  const user = await findUserByEmail(input.email);
  const passwordMatches = await bcrypt.compare(
    input.password,
    user?.passwordHash ?? DUMMY_PASSWORD_HASH,
  );

  if (!user || !passwordMatches) {
    throw new ApiError(401, INVALID_CREDENTIALS);
  }
  return { user: toUserDto(user), token: signAuthToken(user.id) };
}
