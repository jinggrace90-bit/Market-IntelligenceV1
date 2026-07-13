import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../middleware/error';
import { requireAuth } from '../middleware/auth';
import { analyzeArticle, analyzeMacro, aiConfigured } from '../services/ai';

export const aiRouter = Router();

aiRouter.get('/status', (_req, res) => {
  res.json({ configured: aiConfigured() });
});

// AI endpoints require auth to avoid unmetered token spend.
aiRouter.post(
  '/news/:articleId',
  requireAuth,
  asyncHandler(async (req, res) => {
    const force = req.query.force === 'true';
    res.json(await analyzeArticle(req.params.articleId, force));
  }),
);

const macroSchema = z.object({ scenario: z.string().min(3).max(400) });

aiRouter.post(
  '/macro',
  requireAuth,
  asyncHandler(async (req, res) => {
    const { scenario } = macroSchema.parse(req.body);
    res.json(await analyzeMacro(scenario));
  }),
);
