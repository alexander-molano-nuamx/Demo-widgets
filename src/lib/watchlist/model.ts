import type { WatchlistCountry, WatchlistCurrency, WatchlistSession } from "@/lib/mock-data";

export type Country = WatchlistCountry;
export type Currency = WatchlistCurrency;
export type Session = WatchlistSession;
export type AssetClass = "RV" | "RF" | "ETF" | "DER";
export type DataQuality = "realtime" | "delayed" | "stale";
export type Flag = "none" | "green" | "yellow" | "red" | "blue";
export type InstrumentEvent = "dividend" | "earnings" | "material" | "news";
export type AlertStatus = "none" | "active" | "triggered";
export type TickDirection = -1 | 0 | 1;

export interface Position {
  qty: number;
  avgPrice: number;
}

/** Market + reference data of one instrument. Mutated in place by the live feed. */
export interface Instrument {
  id: number;
  orderbook: string;
  description: string;
  assetClass: AssetClass;
  country: Country;
  currency: Currency;
  decimals: number;
  tickSize: number;
  status: "ENABLED" | "DISABLED";
  session: Session;
  settlement: string;
  quality: DataQuality;
  hasPermission: boolean;
  last: number | null;
  netChange: number | null;
  changePercent: number | null;
  open: number | null;
  high: number | null;
  low: number | null;
  previousClose: number | null;
  volume: number | null;
  amount: number | null;
  bidPrice: number | null;
  bidQty: number | null;
  askPrice: number | null;
  askQty: number | null;
  spread: number | null;
  referencePrice: number | null;
  /** Epoch ms of the last trade; formatted in the exchange's time zone. */
  lastTradeAt: number | null;
  lastTick: TickDirection;
  intraday: number[];
  events: InstrumentEvent[];
  position: Position | null;
  /** Present only for synthetic instruments (WL-13). */
  syntheticExpression?: string;
}

export interface ListItem {
  id: number;
  section: string | null;
}

export interface WatchList {
  id: string;
  name: string;
  kind: "user" | "system";
  items: ListItem[];
  /** System lists whose data the user is not entitled to (WL-37). */
  requiresPermission?: boolean;
}

/** Row handed to the grid: instrument + per-list and per-user metadata. */
export interface WatchlistRow extends Instrument {
  section: string | null;
  flag: Flag;
  alert: AlertStatus;
}

export interface PriceAlert {
  instrumentId: number;
  op: ">=" | "<=";
  price: number;
  status: Exclude<AlertStatus, "none">;
}

export interface ListAlert {
  listId: string;
  /** Fires once per instrument when |var %| crosses the threshold. */
  thresholdPercent: number;
  fired: number[];
}

export type RuleField = "changePercent" | "netChange" | "volume" | "spread" | "last";
export type RuleOp = ">" | ">=" | "<" | "<=";
export type RuleStyle = "up" | "down" | "warn" | "info";

export interface ConditionalRule {
  id: string;
  field: RuleField;
  op: RuleOp;
  value: number;
  style: RuleStyle;
}

export interface CalculatedColumn {
  field: `calc_${string}`;
  name: string;
  expression: string;
}

export type Density = "compact" | "standard" | "comfortable";
export type ViewMode = "auto" | "table" | "cards";
export type LinkGroup = "none" | "red" | "blue" | "green" | "yellow";
export type DemoState = "normal" | "loading" | "error" | "disconnected" | "market-closed" | "no-permission";

export interface WatchlistSettings {
  density: Density;
  flashMs: number;
  viewMode: ViewMode;
  linkGroup: LinkGroup;
}

export const MAX_ITEMS_PER_LIST = 500;

export const exchangeByCountry: Record<Country, { code: string; timeZone: string; locale: string; hours: string }> = {
  CL: { code: "BCS", timeZone: "America/Santiago", locale: "es-CL", hours: "09:30–16:00" },
  PE: { code: "BVL", timeZone: "America/Lima", locale: "es-PE", hours: "09:00–15:30" },
  CO: { code: "BVC", timeZone: "America/Bogota", locale: "es-CO", hours: "09:30–15:55" },
};

export const assetClassLabel: Record<AssetClass, string> = {
  RV: "Renta variable",
  RF: "Renta fija",
  ETF: "ETF",
  DER: "Derivados",
};
