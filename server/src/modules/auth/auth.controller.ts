import type { RequestHandler } from 'express';
import { ApiError } from '../../utils/ApiError.js';
import { sendSuccess } from '../../utils/response.js';
import { clearAuthCookie, setAuthCookie } from './auth.cookie.js';
import type { LoginInput, RegisterInput } from './auth.schemas.js';
import { loginUser, registerUser } from './auth.service.js';

// req.body has already been validated and normalized by the validate() middleware.

export const register: RequestHandler = async (req, res) => {
  const { user, token } = await registerUser(req.body as RegisterInput);
  setAuthCookie(res, token);
  sendSuccess(res, 'Registration successful', { user }, 201);
};

export const login: RequestHandler = async (req, res) => {
  const { user, token } = await loginUser(req.body as LoginInput);
  setAuthCookie(res, token);
  sendSuccess(res, 'Login successful', { user });
};

export const logout: RequestHandler = (_req, res) => {
  clearAuthCookie(res);
  sendSuccess(res, 'Logout successful', null);
};

export const me: RequestHandler = (req, res) => {
  if (!req.user) {
    throw new ApiError(401, 'Please log in to continue.');
  }
  sendSuccess(res, 'Current user', { user: req.user });
};
