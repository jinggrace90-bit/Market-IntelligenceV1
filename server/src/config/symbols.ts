// Canonical market-overview instruments. Yahoo Finance symbols are used
// because they require no API key. `^` prefixes are indices, `=F` futures,
// `-USD` crypto, `DX-Y.NYB` the dollar index.
export interface MarketSymbol {
  symbol: string;
  name: string;
  group: 'index' | 'commodity' | 'crypto' | 'rates' | 'fx';
}

export const MARKET_SYMBOLS: MarketSymbol[] = [
  { symbol: '^GSPC', name: 'S&P 500', group: 'index' },
  { symbol: '^IXIC', name: 'NASDAQ Composite', group: 'index' },
  { symbol: '^DJI', name: 'Dow Jones', group: 'index' },
  { symbol: '^RUT', name: 'Russell 2000', group: 'index' },
  { symbol: '^VIX', name: 'VIX Volatility', group: 'index' },
  { symbol: 'DX-Y.NYB', name: 'US Dollar Index (DXY)', group: 'fx' },
  { symbol: 'GC=F', name: 'Gold', group: 'commodity' },
  { symbol: 'SI=F', name: 'Silver', group: 'commodity' },
  { symbol: 'CL=F', name: 'Crude Oil (WTI)', group: 'commodity' },
  { symbol: 'BZ=F', name: 'Brent Oil', group: 'commodity' },
  { symbol: 'BTC-USD', name: 'Bitcoin', group: 'crypto' },
  { symbol: 'ETH-USD', name: 'Ethereum', group: 'crypto' },
  { symbol: '^TNX', name: 'US 10Y Treasury Yield', group: 'rates' },
  { symbol: '^FVX', name: 'US 5Y Treasury Yield', group: 'rates' },
  { symbol: '^IRX', name: 'US 13W T-Bill Yield', group: 'rates' },
];

export const MARKET_SYMBOL_LIST = MARKET_SYMBOLS.map((s) => s.symbol);
