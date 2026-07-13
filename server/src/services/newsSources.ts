// Real, no-key RSS feeds. Each feed declares a default category/country so the
// UI can filter even when the source doesn't tag items. Feeds that go offline
// are skipped gracefully at fetch time.
export interface FeedSource {
  name: string;
  url: string;
  category: string;
  country: string;
}

export const RSS_FEEDS: FeedSource[] = [
  { name: 'CNBC Top News', url: 'https://www.cnbc.com/id/100003114/device/rss/rss.html', category: 'business', country: 'US' },
  { name: 'CNBC Markets', url: 'https://www.cnbc.com/id/20910258/device/rss/rss.html', category: 'markets', country: 'US' },
  { name: 'CNBC Economy', url: 'https://www.cnbc.com/id/20910258/device/rss/rss.html', category: 'economy', country: 'US' },
  { name: 'Yahoo Finance', url: 'https://finance.yahoo.com/news/rssindex', category: 'markets', country: 'US' },
  { name: 'Investing.com', url: 'https://www.investing.com/rss/news.rss', category: 'markets', country: 'Global' },
  { name: 'Investing.com Economy', url: 'https://www.investing.com/rss/news_25.rss', category: 'economy', country: 'Global' },
  { name: 'MarketWatch', url: 'https://feeds.content.dowjones.io/public/rss/mw_topstories', category: 'markets', country: 'US' },
  { name: 'Financial Times', url: 'https://www.ft.com/rss/home', category: 'business', country: 'UK' },
  { name: 'Seeking Alpha', url: 'https://seekingalpha.com/market_news/all.xml', category: 'markets', country: 'US' },
];

// High-signal keyword → weight, used for the importance heuristic.
export const IMPORTANCE_KEYWORDS: Record<string, number> = {
  'federal reserve': 30, fed: 22, fomc: 30, 'rate cut': 28, 'rate hike': 28,
  'interest rate': 24, inflation: 22, cpi: 26, ppi: 20, 'jobs report': 22,
  'nonfarm': 24, unemployment: 18, gdp: 20, recession: 26, 'earnings': 14,
  war: 24, sanctions: 18, tariff: 20, opec: 18, 'default': 20, crisis: 22,
  crash: 24, rally: 12, 'all-time high': 14, downgrade: 16, bankruptcy: 20,
  'central bank': 18, ecb: 16, boj: 16, treasury: 14, yield: 14,
};

// Asset dictionary: phrase → canonical ticker/symbol shown as a "related asset".
export const ASSET_DICTIONARY: Record<string, string> = {
  'apple': 'AAPL', 'aapl': 'AAPL', 'microsoft': 'MSFT', 'msft': 'MSFT',
  'nvidia': 'NVDA', 'nvda': 'NVDA', 'tesla': 'TSLA', 'tsla': 'TSLA',
  'amazon': 'AMZN', 'amzn': 'AMZN', 'meta': 'META', 'google': 'GOOGL',
  'alphabet': 'GOOGL', 'netflix': 'NFLX', 'bitcoin': 'BTC', 'btc': 'BTC',
  'ethereum': 'ETH', 'ether': 'ETH', 'gold': 'GOLD', 'oil': 'OIL',
  'crude': 'OIL', 'brent': 'BRENT', 's&p 500': 'SPX', 's&p': 'SPX',
  'nasdaq': 'NDX', 'dow jones': 'DJI', 'dow': 'DJI', 'russell': 'RUT',
  'treasury': 'US10Y', 'dollar': 'DXY', 'yen': 'JPY', 'euro': 'EUR',
};
