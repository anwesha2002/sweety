import type { RequestHandler } from 'express';
import { ApiError } from '../../utils/ApiError.js';
import { sendSuccess } from '../../utils/response.js';
import type { ReportQuery } from './reports.schemas.js';
import * as reportsService from './reports.service.js';

// req.query has already been validated by the validate() middleware. The user id always comes
// from req.user (set by requireAuth), never from the request.

function currentUserId(req: Parameters<RequestHandler>[0]): string {
  if (!req.user) {
    throw new ApiError(401, 'Please log in to continue.');
  }
  return req.user.id;
}

function selectedDate(req: Parameters<RequestHandler>[0]): string {
  return (req.query as unknown as ReportQuery).date;
}

export const daily: RequestHandler = async (req, res) => {
  const report = await reportsService.getDailyReport(currentUserId(req), selectedDate(req));
  sendSuccess(res, 'Daily report', report);
};

export const monthToDate: RequestHandler = async (req, res) => {
  const report = await reportsService.getMonthToDateReport(currentUserId(req), selectedDate(req));
  sendSuccess(res, 'Month-to-date report', report);
};

export const monthly: RequestHandler = async (req, res) => {
  const report = await reportsService.getMonthlyReport(currentUserId(req), selectedDate(req));
  sendSuccess(res, 'Monthly report', report);
};
