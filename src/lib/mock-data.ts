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
  { symbol: "COPEC", price: 6750.0, changePercent: 1.12 },
  { symbol: "FALABELLA", price: 2430.5, changePercent: -0.35 },
  { symbol: "ENELCHILE", price: 84.24, changePercent: 0.42 },
  { symbol: "BSANTANDER", price: 38.9, changePercent: -0.18 },
  { symbol: "CCU", price: 6180.0, changePercent: 0.65 },
  { symbol: "ECOPETROL", price: 2180.0, changePercent: -1.24 },
  { symbol: "ISA", price: 21400.0, changePercent: 0.91 },
  { symbol: "BANCOLOMBIA", price: 33850.0, changePercent: 0.15 },
  { symbol: "GRUPOAVAL", price: 645.0, changePercent: -0.62 },
  { symbol: "CREDICORP", price: 168.3, changePercent: 1.05 },
  { symbol: "BCP", price: 5.42, changePercent: 0.28 },
  { symbol: "SP MILA 40", price: 512.77, changePercent: 0.37 },
  { symbol: "COLCAP", price: 1345.62, changePercent: -0.21 },
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

export interface OrderBookRow {
  id: number;
  instrumento: string;
  valor: string;
  cantidad: number;
  ops: number;
}

export const orderBookRows: OrderBookRow[] = [
  { id: 1, instrumento: "Ecopetrol", valor: "6.2 M", cantidad: 1904, ops: 24 },
  { id: 2, instrumento: "Isa", valor: "4.8 M", cantidad: 200, ops: 2 },
  { id: 3, instrumento: "Falabella", valor: "3.1 M", cantidad: 860, ops: 11 },
  { id: 4, instrumento: "COPEC", valor: "9.4 M", cantidad: 1250, ops: 18 },
  { id: 5, instrumento: "CCU", valor: "2.6 M", cantidad: 410, ops: 6 },
];

export interface MultiMarketWatchlistRow {
  id: number;
  symbol: string;
  condicion: string;
  moneda: string;
  tipo: string;
  last: string;
}

export const multiMarketWatchlistRows: MultiMarketWatchlistRow[] = [
  { id: 1, symbol: "Canalistas", condicion: "-", moneda: "-", tipo: "-", last: "-" },
  { id: 2, symbol: "COPEC", condicion: "CN", moneda: "CLP", tipo: "Stock", last: "6.750" },
  { id: 3, symbol: "Falabella", condicion: "CN", moneda: "CLP", tipo: "Stock", last: "-" },
  { id: 4, symbol: "Ecopetrol", condicion: "CN", moneda: "COP", tipo: "Stock", last: "2.180" },
  { id: 5, symbol: "CCU", condicion: "CN", moneda: "CLP", tipo: "Stock", last: "6.180" },
];

export interface LastTransactionRow {
  id: number;
  hora: string;
  nemo: string;
  precio: number;
  cantidad: number;
  monto: string;
}

export const lastTransactionRows: LastTransactionRow[] = [
  { id: 1, hora: "10:03:38", nemo: "COPEC", precio: 6.75, cantidad: 1000, monto: "6.75 MM" },
  { id: 2, hora: "10:02:14", nemo: "CCU", precio: 6.18, cantidad: 500, monto: "3.09 MM" },
  { id: 3, hora: "10:01:52", nemo: "Ecopetrol", precio: 2.18, cantidad: 2000, monto: "4.36 MM" },
  { id: 4, hora: "09:58:07", nemo: "Falabella", precio: 4.32, cantidad: 750, monto: "3.24 MM" },
];

export interface OrderManagementRow {
  id: number;
  orderId: string;
  hora: string;
  nemo: string;
  mdo: number;
  side: "V" | "C";
  cantidad: number;
}

export const orderManagementRows: OrderManagementRow[] = [
  { id: 1, orderId: "WS-MRM5 IZ70-039L", hora: "10:04:32", nemo: "COPEC", mdo: 1000, side: "V", cantidad: 1000 },
  { id: 2, orderId: "WS-MRM5 IZ70-039L", hora: "10:04:32", nemo: "COPEC", mdo: 1000, side: "V", cantidad: 1600 },
  { id: 3, orderId: "WS-MRM5 IZ70-039L", hora: "10:04:32", nemo: "COPEC", mdo: 1000, side: "C", cantidad: 100 },
  { id: 4, orderId: "WS-MRM5 IZ70-039L", hora: "10:04:32", nemo: "COPEC", mdo: 1000, side: "C", cantidad: 100 },
  { id: 5, orderId: "WS-MRM5 IZ70-039L", hora: "10:04:32", nemo: "COPEC", mdo: 1000, side: "C", cantidad: 100 },
  { id: 6, orderId: "WS-MRM5 IZ70-041A", hora: "10:03:58", nemo: "CCU", mdo: 500, side: "V", cantidad: 500 },
  { id: 7, orderId: "WS-MRM5 IZ70-041A", hora: "10:03:58", nemo: "CCU", mdo: 500, side: "C", cantidad: 250 },
  { id: 8, orderId: "WS-MRM5 IZ70-042B", hora: "10:02:11", nemo: "Ecopetrol", mdo: 2000, side: "V", cantidad: 2000 },
];

export interface DetailBookRow {
  buyN: number;
  buyQty: number;
  buyPrice: number;
  sellPrice: number | null;
  sellQty: number | null;
  sellN: number | null;
}

export const detailBookRows: DetailBookRow[] = [
  { buyN: 1, buyQty: 1000, buyPrice: 6.73, sellPrice: 6.74, sellQty: 1600, sellN: 1 },
  { buyN: 1, buyQty: 500, buyPrice: 6.72, sellPrice: 6.75, sellQty: 1600, sellN: 1 },
  { buyN: 1, buyQty: 100, buyPrice: 6.71, sellPrice: null, sellQty: null, sellN: null },
];

export interface DetailTransactionRow {
  hora: string;
  precio: number;
  cantidad: number;
}

export const detailTransactionRows: DetailTransactionRow[] = [
  { hora: "10:03:38", precio: 6.75, cantidad: 1000 },
];

export interface OrderMessageRow {
  id: number;
  hora: string;
  status: "Acepted" | "Placed" | "Rejected";
  description: string;
}

export const orderMessageRows: OrderMessageRow[] = [
  { id: 1, hora: "10:03:38", status: "Acepted", description: "Sell 1.000 COPEC @ 6.750.0 Limit" },
  { id: 2, hora: "10:03:38", status: "Acepted", description: "Sell 1.000 COPEC @ 6.750.0 Limit" },
  { id: 3, hora: "10:03:38", status: "Placed", description: "Sell 1.000 COPEC @ 6.750.0 Limit" },
  { id: 4, hora: "10:03:38", status: "Acepted", description: "Sell 1.000 COPEC @ 6.750.0 Limit" },
  { id: 5, hora: "10:03:38", status: "Acepted", description: "Sell 1.000 COPEC @ 6.750.0 Limit" },
];
