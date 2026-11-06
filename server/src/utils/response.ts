import type { Response } from 'express';

/** Success format used everywhere: { success: true, message, data } */
export function sendSuccess<T>(res: Response, message: string, data: T, statusCode = 200): void {
  res.status(statusCode).json({ success: true, message, data });
}
