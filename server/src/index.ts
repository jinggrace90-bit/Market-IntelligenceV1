import http from 'http';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { env } from './config/env';
import { apiRouter } from './routes';
import { errorHandler, notFoundHandler } from './middleware/error';
import { initWebsocket } from './websocket';
import { startJobs } from './jobs';
import { logger } from './utils/logger';
import { prisma } from './lib/prisma';

async function bootstrap() {
  const app = express();

  app.use(helmet());
  app.use(cors({ origin: env.corsOrigin, credentials: true }));
  app.use(express.json({ limit: '1mb' }));

  // Basic abuse protection on the API surface.
  app.use(
    '/api',
    rateLimit({ windowMs: 60_000, max: 300, standardHeaders: true, legacyHeaders: false }),
  );

  app.get('/', (_req, res) => res.json({ name: 'Market Intelligence API', docs: '/api/health' }));
  app.use('/api', apiRouter);

  app.use(notFoundHandler);
  app.use(errorHandler);

  const server = http.createServer(app);
  initWebsocket(server);

  server.listen(env.port, () => {
    logger.info(`API + WS listening on http://localhost:${env.port}`);
  });

  // Background ingestion + cache warming.
  startJobs();

  const shutdown = async () => {
    logger.info('Shutting down…');
    server.close();
    await prisma.$disconnect();
    process.exit(0);
  };
  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
}

bootstrap().catch((err) => {
  logger.error('Fatal boot error', err);
  process.exit(1);
});
