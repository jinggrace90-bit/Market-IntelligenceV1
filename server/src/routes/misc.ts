import { Router } from 'express';
import { asyncHandler } from '../middleware/error';
import { getSentiment } from '../services/sentiment';
import { getEconomicCalendar } from '../services/economicCalendar';
import { globalSearch } from '../services/search';
import { badRequest } from '../utils/http';

export const sentimentRouter = Router();
sentimentRouter.get(
  '/',
  asyncHandler(async (_req, res) => {
    res.json({ data: await getSentiment() });
  }),
);

export const calendarRouter = Router();
calendarRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    let events = await getEconomicCalendar();
    const { country, importance } = req.query;
    if (country) events = events.filter((e) => e.country === country);
    if (importance) events = events.filter((e) => e.importance === importance);
    res.json({ data: events });
  }),
);

export const searchRouter = Router();
searchRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    const q = String(req.query.q ?? '').trim();
    if (!q) throw badRequest('Provide ?q=');
    res.json({ data: await globalSearch(q) });
  }),
);
