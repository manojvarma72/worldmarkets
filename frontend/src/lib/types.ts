export interface Quote {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  currency: string;
}

export interface CryptoQuote {
  id: string;
  name: string;
  symbol: string;
  priceUsd: number;
  priceInr: number;
  change24h: number;
}

export interface Fund {
  name: string;
  nav: number;
  date: string | null;
  source: string;
}

export interface Mover {
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
}

export interface NewsItem {
  title: string;
  source: string;
  link: string;
  publishedAt: number | null;
}

export interface MarketsResponse {
  indices: Quote[];
  sparklines: Record<string, number[]>;
  crypto: CryptoQuote[];
  commodities: Quote[];
  etfs: Quote[];
  fund: Fund;
  movers: { gainers: Mover[]; losers: Mover[] };
  world: Record<string, Quote[]>;
  news: NewsItem[];
  updated: number;
}
