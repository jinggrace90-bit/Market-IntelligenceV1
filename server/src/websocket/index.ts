import { Server as HttpServer } from 'http';
import { Server as IOServer, Socket } from 'socket.io';
import { env } from '../config/env';
import { getMarketOverview } from '../services/marketData';
import { getNews } from '../services/news';
import { getSentiment } from '../services/sentiment';
import { logger } from '../utils/logger';

let io: IOServer | null = null;

/**
 * Realtime channels:
 *  - `market:overview`  pushed every 15s
 *  - `news:latest`      pushed every 60s (top of feed)
 *  - `sentiment`        pushed every 5m
 * Clients receive an immediate snapshot on connect.
 */
export function initWebsocket(server: HttpServer): IOServer {
  io = new IOServer(server, {
    cors: { origin: env.corsOrigin, methods: ['GET', 'POST'] },
  });

  io.on('connection', async (socket: Socket) => {
    logger.debug(`WS connected: ${socket.id}`);
    // Send an immediate snapshot so the UI paints without waiting for a tick.
    try {
      socket.emit('market:overview', await getMarketOverview());
      socket.emit('sentiment', await getSentiment());
      const news = await getNews({ limit: 20 });
      socket.emit('news:latest', news.items);
    } catch (err) {
      logger.warn('Failed to send initial WS snapshot');
    }
    socket.on('disconnect', () => logger.debug(`WS disconnected: ${socket.id}`));
  });

  startBroadcasters();
  return io;
}

function startBroadcasters() {
  const safeEmit = async (event: string, produce: () => Promise<unknown>) => {
    if (!io || io.engine.clientsCount === 0) return;
    try {
      io.emit(event, await produce());
    } catch (err) {
      logger.warn(`Broadcast failed for ${event}`);
    }
  };

  setInterval(() => safeEmit('market:overview', getMarketOverview), 15_000);
  setInterval(() => safeEmit('news:latest', async () => (await getNews({ limit: 20 })).items), 60_000);
  setInterval(() => safeEmit('sentiment', getSentiment), 5 * 60_000);
}

export function getIo(): IOServer | null {
  return io;
}
