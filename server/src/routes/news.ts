import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../middleware/error';
import { getNews, ingestNews } from '../services/news';

export const newsRouter = Router();

const querySchema = z.object({
  cursor: z.string().optional(),
  limit: z.coerce.number().min(1).max(50).optional(),
  category: z.string().optional(),
  country: z.string().optional(),
  search: z.string().optional(),
  minImportance: z.coerce.number().min(0).max(100).optional(),
});

newsRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    const query = querySchema.parse(req.query);
    res.json(await getNews(query));
  }),
);

// Manual refresh trigger (also runs on a cron schedule).
newsRouter.post(
  '/refresh',
  asyncHandler(async (_req, res) => {
    const inserted = await ingestNews();
    res.json({ inserted });
  }),
);
