import { isAxiosError } from 'axios';
import type { ApiSuccess } from '../types/api';
import type { User } from '../types/user';
import { api } from './api';

interface UserPayload {
  user: User;
}

export interface RegisterInput {
  name: string;
  email: string;
  password: string;
}

export interface LoginInput {
  email: string;
  password: string;
}

export async function register(input: RegisterInput): Promise<User> {
  const { data } = await api.post<ApiSuccess<UserPayload>>('/auth/register', input);
  return data.data.user;
}

export async function login(input: LoginInput): Promise<User> {
  const { data } = await api.post<ApiSuccess<UserPayload>>('/auth/login', input);
  return data.data.user;
}

export async function logout(): Promise<void> {
  await api.post('/auth/logout');
}

/** Returns the logged-in user, or null when nobody is logged in (a 401 is not an error here). */
export async function getCurrentUser(): Promise<User | null> {
  try {
    const { data } = await api.get<ApiSuccess<UserPayload>>('/auth/me');
    return data.data.user;
  } catch (error) {
    if (isAxiosError(error) && error.response?.status === 401) {
      return null;
    }
    throw error;
  }
}
