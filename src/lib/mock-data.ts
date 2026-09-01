export interface TickerItem {
  symbol: string;
  price: number;
  changePercent: number;
}

export const tickerItems: TickerItem[] = [
  { symbol: "SPCLX IT", price: 527.13, changePercent: 0.0 },
  { symbol: "SPCLX INDS", price: 1408.96, changePercent: 0.26 },
  { symbol: "SPCLXIGPA", price: 40678.13, changePercent: 0.79 },
  { symbol: "SPCLX MATERLS", price: 1563.28, changePercent: -0.94 },
  { symbol: "SP IPSA", price: 8136.46, changePercent: 0.83 },
  { symbol: "SPCLX RE", price: 1515.45, changePercent: 0.48 },
  { symbol: "SPCLX TELECOS", price: 1024.23, changePercent: 0.18 },
];

export interface WatchlistRow {
  id: number;
  fileId: string;
  name: string;
  category: string;
  market: string;
  segment: string;
  currency: string;
  country: string;
}

export const watchlistRows: WatchlistRow[] = Array.from({ length: 18 }).map(
  (_, index) => ({
    id: index + 1,
    fileId: "10683190UD",
    name: "87182",
    category: "BGF World financ...",
    market: "Equity",
    segment: "Mercado Global",
    currency: "Global USD CL",
    country: "USD",
  }),
);

export interface Candle {
  time: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

function seededRandom(seed: number) {
  let value = seed;
  return () => {
    value = (value * 9301 + 49297) % 233280;
    return value / 233280;
  };
}

export function generateCandles(count = 42): Candle[] {
  const random = seededRandom(42);
  const candles: Candle[] = [];
  let price = 1.142;
  const startHour = 15;

  for (let i = 0; i < count; i += 1) {
    const open = price;
    const volatility = 0.004 + random() * 0.006;
    const direction = random() > 0.48 ? 1 : -1;
    const close = open + direction * volatility * (0.4 + random());
    const high = Math.max(open, close) + random() * 0.003;
    const low = Math.min(open, close) - random() * 0.003;
    const volume = Math.round(40 + random() * 260);

    const hour = (startHour + Math.floor(i / 2)) % 24;
    const minute = i % 2 === 0 ? "00" : "30";
    const meridiem = hour >= 12 ? "PM" : "AM";
    const displayHour = hour % 12 === 0 ? 12 : hour % 12;

    candles.push({
      time: `${displayHour}:${minute} ${meridiem}`,
      open,
      high,
      low,
      close,
      volume,
    });

    price = close;
  }

  return candles;
}

export interface MarketDepthRow {
  bidAcum: number;
  bidQty: number;
  bidPrice: number;
  askPrice: number;
  askQty: number;
  askAcum: number;
}

export const marketDepthRows: MarketDepthRow[] = [
  { bidAcum: 12500, bidQty: 12500, bidPrice: 84.21, askPrice: 84.24, askQty: 8200, askAcum: 8200 },
  { bidAcum: 25100, bidQty: 12600, bidPrice: 84.2, askPrice: 84.25, askQty: 6100, askAcum: 14300 },
  { bidAcum: 39800, bidQty: 14700, bidPrice: 84.19, askPrice: 84.26, askQty: 9400, askAcum: 23700 },
  { bidAcum: 52200, bidQty: 12400, bidPrice: 84.18, askPrice: 84.27, askQty: 5300, askAcum: 29000 },
  { bidAcum: 68900, bidQty: 16700, bidPrice: 84.17, askPrice: 84.28, askQty: 7800, askAcum: 36800 },
  { bidAcum: 81200, bidQty: 12300, bidPrice: 84.16, askPrice: 84.29, askQty: 6600, askAcum: 43400 },
  { bidAcum: 95600, bidQty: 14400, bidPrice: 84.15, askPrice: 84.3, askQty: 8900, askAcum: 52300 },
];

export interface InstrumentRankingRow {
  instrumento: string;
  valor: string;
}

export const instrumentRankingRows: InstrumentRankingRow[] = [
  { instrumento: "Ecopetrol", valor: "6.2 M" },
  { instrumento: "Ecopetrol", valor: "6.2 M" },
  { instrumento: "Ecopetrol", valor: "6.2 M" },
  { instrumento: "Ecopetrol", valor: "6.2 M" },
  { instrumento: "Isa", valor: "4.8 M" },
  { instrumento: "Isa", valor: "4.8 M" },
  { instrumento: "Isa", valor: "4.8 M" },
];

export interface ParticipationRankingRow {
  corredora: string;
  cantidad: string;
}

export const participationRankingRows: ParticipationRankingRow[] = [
  { corredora: "CL0035", cantidad: "64.2 M" },
  { corredora: "CL0035", cantidad: "64.2 M" },
  { corredora: "CL0035", cantidad: "64.2 M" },
  { corredora: "CL0035", cantidad: "64.2 M" },
  { corredora: "CO0002", cantidad: "22.0 M" },
  { corredora: "CO0002", cantidad: "22.0 M" },
  { corredora: "CO0002", cantidad: "22.0 M" },
];
