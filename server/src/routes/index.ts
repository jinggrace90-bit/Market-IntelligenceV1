import { Router } from 'express';
import { authRouter } from './auth';
import { marketRouter } from './market';
import { newsRouter } from './news';
import { aiRouter } from './ai';
import { watchlistRouter } from './watchlist';
import { sentimentRouter, calendarRouter, searchRouter } from './misc';

export const apiRouter = Router();

apiRouter.get('/health', (_req, res) => res.json({ status: 'ok', time: new Date().toISOString() }));

apiRouter.use('/auth', authRouter);
apiRouter.use('/market', marketRouter);
apiRouter.use('/news', newsRouter);
apiRouter.use('/ai', aiRouter);
apiRouter.use('/watchlist', watchlistRouter);
apiRouter.use('/sentiment', sentimentRouter);
apiRouter.use('/calendar', calendarRouter);
apiRouter.use('/search', searchRouter);
