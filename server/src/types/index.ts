export interface Quote {
  symbol: string;
  name: string;
  group?: string;
  price: number;
  change: number;
  changePercent: number;
  previousClose: number;
  currency?: string;
  marketState?: string;
  updatedAt: string;
}

export interface SparklinePoint {
  t: number; // epoch ms
  c: number; // close
}

export interface MarketCard extends Quote {
  spark: SparklinePoint[];
}

export interface NewsItem {
  id: string;
  externalId: string;
  title: string;
  url: string;
  source: string;
  category: string | null;
  country: string | null;
  imageUrl: string | null;
  summary: string | null;
  publishedAt: string;
  relatedAssets: string[];
  importance: number;
}

export interface SentimentSnapshot {
  fearGreed: { value: number; label: string; updatedAt: string } | null;
  vix: { value: number; changePercent: number } | null;
  newsSentiment: { bullish: number; bearish: number; neutral: number } | null;
  updatedAt: string;
}

export interface EconomicEvent {
  id: string;
  date: string;
  country: string;
  event: string;
  importance: 'low' | 'medium' | 'high';
  previous: string | null;
  forecast: string | null;
  actual: string | null;
}

export interface AiNewsAnalysis {
  summary: string;
  keyEvents: string[];
  sentiment: 'bullish' | 'bearish' | 'neutral';
  sentimentScore: number;
  affectedSectors: string[];
  affectedAssets: string[];
  marketImplication: string;
  model: string;
  cached: boolean;
}
