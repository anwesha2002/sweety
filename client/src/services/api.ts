import axios from 'axios';

/** One shared Axios instance. Cookies (the JWT) are sent automatically by the browser. */
export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? '/api/v1',
  withCredentials: true,
});

type UnauthorizedHandler = () => void;
let onUnauthorized: UnauthorizedHandler | null = null;

/** The AuthProvider registers what should happen when the session turns out to be invalid. */
export function setUnauthorizedHandler(handler: UnauthorizedHandler | null): void {
  onUnauthorized = handler;
}

api.interceptors.response.use(
  (response) => response,
  (error: unknown) => {
    if (axios.isAxiosError(error) && error.response?.status === 401) {
      // Auth endpoints answer 401 for normal reasons ("not logged in" from /auth/me, wrong
      // password from /auth/login), so only other endpoints mean "your session expired".
      // Ignoring /auth/* also prevents a redirect loop when the app checks /auth/me on load.
      const isAuthEndpoint = error.config?.url?.startsWith('/auth/') ?? false;
      if (!isAuthEndpoint) {
        onUnauthorized?.();
      }
    }
    return Promise.reject(error);
  },
);
