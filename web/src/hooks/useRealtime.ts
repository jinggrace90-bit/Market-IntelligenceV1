'use client';

import { useEffect, useState } from 'react';
import { getSocket } from '@/lib/socket';
import { api } from '@/lib/api';
import type { MarketCard, NewsItem, SentimentSnapshot } from '@/types';

interface RealtimeState {
  market: MarketCard[];
  news: NewsItem[];
  sentiment: SentimentSnapshot | null;
  connected: boolean;
}

/**
 * Subscribes to the server's realtime channels and also seeds via REST so the
 * UI paints immediately even if the socket handshake is slow.
 */
export function useRealtime(): RealtimeState {
  const [market, setMarket] = useState<MarketCard[]>([]);
  const [news, setNews] = useState<NewsItem[]>([]);
  const [sentiment, setSentiment] = useState<SentimentSnapshot | null>(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    let mounted = true;

    // REST seed (parallel, best-effort).
    api.get('/market/overview').then((r) => mounted && setMarket(r.data.data)).catch(() => {});
    api.get('/sentiment').then((r) => mounted && setSentiment(r.data.data)).catch(() => {});

    const socket = getSocket();
    const onConnect = () => setConnected(true);
    const onDisconnect = () => setConnected(false);
    const onMarket = (data: MarketCard[]) => setMarket(data);
    const onNews = (data: NewsItem[]) => setNews(data);
    const onSentiment = (data: SentimentSnapshot) => setSentiment(data);

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('market:overview', onMarket);
    socket.on('news:latest', onNews);
    socket.on('sentiment', onSentiment);
    setConnected(socket.connected);

    return () => {
      mounted = false;
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('market:overview', onMarket);
      socket.off('news:latest', onNews);
      socket.off('sentiment', onSentiment);
    };
  }, []);

  return { market, news, sentiment, connected };
}
