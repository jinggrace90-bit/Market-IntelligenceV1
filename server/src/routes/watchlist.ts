import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../middleware/error';
import { AuthedRequest, requireAuth } from '../middleware/auth';
import * as service from '../services/watchlist';

export const watchlistRouter = Router();

watchlistRouter.use(requireAuth);

watchlistRouter.get(
  '/',
  asyncHandler(async (req: AuthedRequest, res) => {
    res.json({ data: await service.getWatchlist(req.userId!) });
  }),
);

const addSchema = z.object({
  symbol: z.string().min(1).max(20),
  name: z.string().max(120).optional(),
  assetType: z.enum(['stock', 'etf', 'crypto', 'commodity', 'index']).optional(),
});

watchlistRouter.post(
  '/',
  asyncHandler(async (req: AuthedRequest, res) => {
    const { symbol, name, assetType } = addSchema.parse(req.body);
    const item = await service.addToWatchlist(req.userId!, symbol, name, assetType);
    res.status(201).json({ data: item });
  }),
);

watchlistRouter.delete(
  '/:id',
  asyncHandler(async (req: AuthedRequest, res) => {
    await service.removeFromWatchlist(req.userId!, req.params.id);
    res.status(204).end();
  }),
);

const reorderSchema = z.object({ orderedIds: z.array(z.string()).min(1) });

watchlistRouter.put(
  '/reorder',
  asyncHandler(async (req: AuthedRequest, res) => {
    const { orderedIds } = reorderSchema.parse(req.body);
    await service.reorderWatchlist(req.userId!, orderedIds);
    res.json({ ok: true });
  }),
);
