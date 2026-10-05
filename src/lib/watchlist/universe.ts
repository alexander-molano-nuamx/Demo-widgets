import { watchlistInstrumentRows, type WatchlistFlag } from "@/lib/mock-data";
import { evaluateFormula, parseFormula } from "./formula";
import type {
  AssetClass,
  Country,
  Currency,
  DataQuality,
  Flag,
  Instrument,
  InstrumentEvent,
  Session,
  WatchList,
} from "./model";

/** Deterministic PRNG (mulberry32) so the mock universe is identical on every load. */
function createRandom(seed: number) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const BASE_TIME = Date.UTC(2026, 9, 5, 14, 0, 0);
const INTRADAY_POINTS = 30;

const tickersByCountry: Record<Country, string[]> = {
  CL: ["FALABELLA", "CENCOSUD", "SQM-B", "CHILE", "BCI", "ENELAM", "LTM", "CMPC", "VAPORES", "ANDINA-B", "COLBUN", "PARAUCO", "CCU", "MALLPLAZA", "AGUAS-A", "ENTEL", "ITAUCL", "QUINENCO", "RIPLEY", "SMU"],
  PE: ["BAP", "BVN", "FERREYC1", "ALICORC1", "SCCO", "UNACEMC1", "IFS", "CPACASC1", "BBVAC1", "ENGIEC1", "MINSURI1", "VOLCABC1", "INRETC1", "CASAGRC1", "RELAPAC1"],
  CO: ["ECOPETROL", "PFBCOLOM", "ISA", "GEB", "NUTRESA", "GRUPOARGOS", "CEMARGOS", "BOGOTA", "CELSIA", "PROMIGAS", "BVC", "MINEROS", "TERPEL", "CORFICOLCF", "PFDAVVNDA"],
};

const currencyByCountry: Record<Country, Currency> = { CL: "CLP", PE: "PEN", CO: "COP" };
const priceRangeByCountry: Record<Country, [number, number]> = {
  CL: [150, 25000],
  PE: [1.2, 260],
  CO: [900, 65000],
};

function pick<T>(rand: () => number, items: readonly T[]): T {
  return items[Math.floor(rand() * items.length)];
}

function roundToTick(value: number, tickSize: number) {
  return Math.round(value / tickSize) * tickSize;
}

export function buildIntraday(rand: () => number, close: number, last: number) {
  const points: number[] = [];
  for (let i = 0; i < INTRADAY_POINTS; i += 1) {
    const t = i / (INTRADAY_POINTS - 1);
    const noise = (rand() - 0.5) * Math.abs(last - close || close * 0.004) * 1.4;
    points.push(close + (last - close) * t + noise * (1 - t * 0.6));
  }
  points[points.length - 1] = last;
  return points;
}

function makeGenerated(id: number, index: number, rand: () => number): Instrument {
  const country: Country = index % 3 === 0 ? "CL" : index % 3 === 1 ? "PE" : "CO";
  const tickers = tickersByCountry[country];
  // Index within the country, so every ticker of every market is generated.
  const localIndex = Math.floor(index / 3);
  const base = tickers[localIndex % tickers.length];
  const series = Math.floor(localIndex / tickers.length);
  const roll = rand();
  // The first occurrence of each ticker is always the plain equity (e.g. ECOPETROL, BAP).
  const assetClass: AssetClass =
    series === 0 ? "RV" : roll < 0.72 ? "RV" : roll < 0.84 ? "ETF" : roll < 0.95 ? "RF" : "DER";
  const orderbook =
    assetClass === "RF"
      ? `${country === "CL" ? "BTP" : country === "PE" ? "SOB" : "TFIT"}${String(100 + index).slice(-3)}${2027 + (index % 12)}`
      : assetClass === "DER"
        ? `F${base.slice(0, 4)}${["MAR", "JUN", "SEP", "DIC"][index % 4]}${27 + (index % 3)}`
        : series === 0
          ? base
          : `${base}-S${series}`;

  const [min, max] = priceRangeByCountry[country];
  const decimals = assetClass === "RF" ? 4 : country === "PE" ? 2 : 2;
  const tickSize = assetClass === "RF" ? 0.0001 : country === "PE" ? 0.01 : country === "CL" ? 0.1 : 1;
  const previousClose = roundToTick(
    assetClass === "RF" ? 90 + rand() * 20 : min + rand() * rand() * (max - min),
    tickSize,
  );

  const sessionRoll = rand();
  // Blue chips (first occurrence of each ticker) are always trading in the continuous session.
  const session: Session =
    series === 0 || sessionRoll < 0.84
      ? "Continuo"
      : sessionRoll < 0.9
        ? "Subasta"
        : sessionRoll < 0.95
          ? "Pre-apertura"
          : sessionRoll < 0.98
            ? "Cerrado"
            : "Suspendido";
  const status = session === "Suspendido" ? "DISABLED" : "ENABLED";
  const qualityRoll = rand();
  const quality: DataQuality = country === "PE" && qualityRoll < 0.35 ? "delayed" : "realtime";
  // Some derivatives and a few BVL series fall outside the user's market-data entitlement (WL-37).
  const hasPermission = !(assetClass === "DER" && rand() < 0.6) && !(country === "PE" && series >= 2 && qualityRoll > 0.88);
  const traded = series === 0 || (session !== "Pre-apertura" && rand() > 0.06);

  const change = (rand() - 0.48) * 0.06;
  const last = traded ? roundToTick(previousClose * (1 + change), tickSize) : null;
  const netChange = last == null ? null : last - previousClose;
  const changePercent = last == null ? null : (netChange! / previousClose) * 100;
  const spreadTicks = 1 + Math.floor(rand() * 4);
  const bidPrice = last == null ? null : roundToTick(last - tickSize * spreadTicks * 0.5, tickSize);
  const askPrice = last == null ? null : roundToTick(last + tickSize * spreadTicks * 0.5, tickSize);
  const volume = last == null ? null : Math.round(rand() * rand() * 900000);
  const eventsRoll = rand();
  const events: InstrumentEvent[] =
    eventsRoll < 0.06 ? ["dividend"] : eventsRoll < 0.1 ? ["earnings"] : eventsRoll < 0.12 ? ["material", "news"] : eventsRoll < 0.18 ? ["news"] : [];

  return {
    id,
    orderbook,
    description:
      assetClass === "RF"
        ? `BONO ${country === "CL" ? "TESORERÍA" : country === "PE" ? "SOBERANO" : "TES"} ${2027 + (index % 12)} · SERIE ${index}`
        : assetClass === "DER"
          ? `FUTURO ${base} VTO ${["MAR", "JUN", "SEP", "DIC"][index % 4]}`
          : assetClass === "ETF"
            ? `ETF ${base} INDEX FUND ${series > 0 ? `S${series}` : ""}`.trim()
            : `${base} S.A.${series > 0 ? ` SERIE ${series}` : ""}`,
    assetClass,
    country,
    currency: assetClass === "RF" && rand() < 0.3 ? "USD" : currencyByCountry[country],
    decimals,
    tickSize,
    status,
    session,
    settlement: assetClass === "RF" ? "T+0" : pick(rand, ["T+1", "T+2"]),
    quality,
    hasPermission,
    last,
    netChange,
    changePercent,
    open: last == null ? null : roundToTick(previousClose * (1 + (rand() - 0.5) * 0.01), tickSize),
    high: last == null ? null : Math.max(last, previousClose) + tickSize * Math.floor(rand() * 8),
    low: last == null ? null : Math.min(last, previousClose) - tickSize * Math.floor(rand() * 8),
    previousClose,
    volume,
    amount: last == null || volume == null ? null : Math.round(volume * last),
    bidPrice,
    bidQty: bidPrice == null ? null : Math.round(100 + rand() * 9000),
    askPrice,
    askQty: askPrice == null ? null : Math.round(100 + rand() * 9000),
    spread: bidPrice == null || askPrice == null ? null : askPrice - bidPrice,
    referencePrice: previousClose,
    lastTradeAt: last == null ? null : BASE_TIME - Math.floor(rand() * 3 * 3600 * 1000),
    lastTick: 0,
    intraday: last == null ? [] : buildIntraday(rand, previousClose, last),
    events,
    position: null,
  };
}

function seedToInstrument(index: number, rand: () => number): Instrument {
  const seed = watchlistInstrumentRows[index];
  const last = seed.last;
  return {
    id: seed.id,
    orderbook: seed.orderbook,
    description: seed.description,
    assetClass: seed.orderbook.startsWith("GX") ? "ETF" : "RV",
    country: seed.country,
    currency: seed.currency,
    decimals: 2,
    tickSize: 0.01,
    status: seed.status,
    session: seed.session,
    settlement: seed.settlement,
    quality: seed.country === "PE" ? "delayed" : "realtime",
    hasPermission: true,
    last,
    netChange: seed.netChange,
    changePercent: seed.changePercent,
    open: seed.open,
    high: seed.high,
    low: seed.low,
    previousClose: seed.previousClose,
    volume: seed.volume,
    amount: seed.amount,
    bidPrice: seed.bidPrice,
    bidQty: seed.bidQty,
    askPrice: seed.askPrice,
    askQty: seed.askQty,
    spread: seed.spread,
    referencePrice: seed.referencePrice,
    lastTradeAt: last == null ? null : BASE_TIME - (index + 1) * 7 * 60 * 1000,
    lastTick: 0,
    intraday: last == null || seed.previousClose == null ? [] : buildIntraday(rand, seed.previousClose, last),
    events: index === 1 ? ["dividend"] : index === 7 ? ["earnings", "news"] : index === 9 ? ["material"] : [],
    position: null,
  };
}

const GENERATED_COUNT = 620;
/** Default "Renta Variable" list size: close to (but under) the per-list limit. */
const DEFAULT_LIST_SIZE = 480;

export interface Universe {
  instruments: Map<number, Instrument>;
  initialFlags: Record<number, Flag>;
  defaultLists: WatchList[];
}

const flagFromSeed: Record<WatchlistFlag, Flag> = { none: "none", green: "green", yellow: "yellow", red: "red" };
const sectionByCountry: Record<Country, string> = {
  CL: "Chile · BCS",
  PE: "Perú · BVL",
  CO: "Colombia · BVC",
};

export function createUniverse(minInstruments = 0): Universe {
  const rand = createRandom(20261005);
  const instruments = new Map<number, Instrument>();
  const initialFlags: Record<number, Flag> = {};

  watchlistInstrumentRows.forEach((seed, index) => {
    instruments.set(seed.id, seedToInstrument(index, rand));
    if (seed.flag !== "none") initialFlags[seed.id] = flagFromSeed[seed.flag];
  });
  const usedOrderbooks = new Set(watchlistInstrumentRows.map((r) => r.orderbook));
  const generatedCount = Math.max(GENERATED_COUNT, minInstruments - watchlistInstrumentRows.length);
  for (let i = 0; i < generatedCount; i += 1) {
    const id = 1000 + i;
    const inst = makeGenerated(id, i, rand);
    // Tree data paths are built from the orderbook, so it must be unique.
    if (usedOrderbooks.has(inst.orderbook)) inst.orderbook = `${inst.orderbook}-${i}`;
    usedOrderbooks.add(inst.orderbook);
    instruments.set(id, inst);
  }

  // A handful of open positions for the P&L columns (WL-12) and the "Mis posiciones" system list.
  const positionIds = [2, 4, 8, 9, 1003, 1010, 1021, 1034, 1047, 1058, 1062, 1075];
  positionIds.forEach((id, i) => {
    const inst = instruments.get(id);
    if (!inst || inst.previousClose == null) return;
    inst.position = { qty: (i + 1) * 150, avgPrice: inst.previousClose * (1 + ((i % 5) - 2) * 0.012) };
  });

  const seedIds = watchlistInstrumentRows.map((r) => r.id);
  const generatedRv = Array.from(instruments.values()).filter(
    (inst) => inst.id >= 1000 && (inst.assetClass === "RV" || inst.assetClass === "ETF"),
  );
  const mainItems = [
    ...seedIds.map((id) => ({ id, section: null })),
    ...generatedRv.slice(0, DEFAULT_LIST_SIZE - seedIds.length).map((inst) => ({
      id: inst.id,
      section: sectionByCountry[inst.country],
    })),
  ];
  // Sections must be contiguous for a readable tree, so sort by section keeping relative order.
  const sectionOrder = [null, ...Object.values(sectionByCountry)];
  mainItems.sort((a, b) => sectionOrder.indexOf(a.section) - sectionOrder.indexOf(b.section));

  const mostTraded = Array.from(instruments.values())
    .filter((inst) => inst.amount != null && inst.hasPermission)
    .sort((a, b) => (b.amount ?? 0) - (a.amount ?? 0))
    .slice(0, 25)
    .map((inst) => ({ id: inst.id, section: null }));
  const positions = positionIds.filter((id) => instruments.get(id)?.position).map((id) => ({ id, section: null }));
  const derivatives = Array.from(instruments.values())
    .filter((inst) => inst.assetClass === "DER")
    .slice(0, 30)
    .map((inst) => ({ id: inst.id, section: null }));

  return {
    instruments,
    initialFlags,
    defaultLists: [
      { id: "renta-variable", name: "Renta Variable", kind: "user", items: mainItems },
      { id: "renta-fija", name: "Renta Fija", kind: "user", items: [] },
      { id: "sys-mas-transados", name: "Más transados", kind: "system", items: mostTraded },
      { id: "sys-posiciones", name: "Mis posiciones", kind: "system", items: positions },
      { id: "sys-derivados", name: "Derivados MILA", kind: "system", items: derivatives, requiresPermission: true },
    ],
  };
}

export function roundPrice(value: number, tickSize: number) {
  return roundToTick(value, tickSize);
}

/**
 * Builds a synthetic instrument (e.g. a spread between two papers, WL-13) from a formula that
 * references other instruments. Returns null if the formula is invalid or references are unknown.
 */
export function createSyntheticInstrument(
  def: { id: number; name: string; expression: string },
  byOrderbook: Map<string, Instrument>,
): Instrument | null {
  const parsed = parseFormula(def.expression);
  if (!parsed.ok || parsed.references.length === 0) return null;
  const legs = parsed.references.map((ref) => byOrderbook.get(ref));
  if (legs.some((leg) => !leg)) return null;
  const first = legs[0]!;
  const last = evaluateFormula(parsed.ast, {}, (ob) => byOrderbook.get(ob));
  // Previous close of the synthetic = same formula evaluated on each leg's previous close.
  const previousClose = evaluateFormula(parsed.ast, {}, (ob) => {
    const leg = byOrderbook.get(ob);
    return leg && { ...leg, last: leg.previousClose };
  });
  const netChange = last != null && previousClose != null ? last - previousClose : null;
  return {
    id: def.id,
    orderbook: `SYN-${def.id - SYNTHETIC_ID_BASE}`,
    description: def.name,
    assetClass: first.assetClass,
    country: first.country,
    currency: first.currency,
    decimals: 2,
    tickSize: 0.01,
    status: "ENABLED",
    session: "Continuo",
    settlement: "—",
    quality: legs.some((leg) => leg!.quality === "delayed") ? "delayed" : "realtime",
    hasPermission: legs.every((leg) => leg!.hasPermission),
    last,
    netChange,
    changePercent: netChange != null && previousClose ? (netChange / Math.abs(previousClose)) * 100 : null,
    open: null,
    high: null,
    low: null,
    previousClose,
    volume: null,
    amount: null,
    bidPrice: null,
    bidQty: null,
    askPrice: null,
    askQty: null,
    spread: null,
    referencePrice: previousClose,
    lastTradeAt: last == null ? null : Date.now(),
    lastTick: 0,
    intraday: last == null ? [] : [last],
    events: [],
    position: null,
    syntheticExpression: def.expression,
  };
}

export const SYNTHETIC_ID_BASE = 900000;
