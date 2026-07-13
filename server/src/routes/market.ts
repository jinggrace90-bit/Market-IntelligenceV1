import { Router } from 'express';
import { asyncHandler } from '../middleware/error';
import { getMarketOverview, getQuotes, getSparkline } from '../services/marketData';
import { badRequest } from '../utils/http';

export const marketRouter = Router();

marketRouter.get(
  '/overview',
  asyncHandler(async (_req, res) => {
    res.json({ data: await getMarketOverview() });
  }),
);

marketRouter.get(
  '/quotes',
  asyncHandler(async (req, res) => {
    const raw = String(req.query.symbols ?? '').trim();
    if (!raw) throw badRequest('Provide ?symbols=AAPL,MSFT');
    const symbols = raw.split(',').map((s) => s.trim().toUpperCase()).filter(Boolean);
    res.json({ data: await getQuotes(symbols) });
  }),
);

marketRouter.get(
  '/spark/:symbol',
  asyncHandler(async (req, res) => {
    res.json({ data: await getSparkline(req.params.symbol) });
  }),
);
