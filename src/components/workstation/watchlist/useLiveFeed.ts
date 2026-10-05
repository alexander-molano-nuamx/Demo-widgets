"use client";

import { useEffect, useRef, type RefObject } from "react";
import { evaluateFormula, parseFormula, type FormulaNode } from "@/lib/watchlist/formula";
import type { Instrument, ListAlert, PriceAlert } from "@/lib/watchlist/model";
import { roundPrice } from "@/lib/watchlist/universe";
import { DEFAULT_TICKS_PER_SECOND } from "@/lib/watchlist/benchmark";

const TICK_INTERVAL_MS = 250;
const INTRADAY_POINTS = 30;

/**
 * Where ticks are delivered. Each grid implementation provides one: MUI X → `apiRef.updateRows`,
 * AG Grid → `api.applyTransactionAsync`. It must ignore ids the grid does not hold and do
 * nothing while the grid is unmounted (the panel unmounts it while minimized).
 */
export interface TickSink {
  push(updates: Instrument[]): void;
}

interface LiveFeedOptions {
  sinkRef: RefObject<TickSink | null>;
  instruments: Map<number, Instrument>;
  byOrderbook: Map<string, Instrument>;
  /** Ids currently loaded in the grid; only these are ticked and pushed to it. */
  activeIdsRef: RefObject<number[]>;
  enabled: boolean;
  /** Simulated ticks per second, delivered in batches every TICK_INTERVAL_MS. */
  ticksPerSecond?: number;
  /** Collect counters on window.__wlBench (benchmark mode only). */
  measure?: boolean;
  priceAlertsRef: RefObject<PriceAlert[]>;
  listAlertRef: RefObject<ListAlert | null>;
  onPriceAlert: (alert: PriceAlert, instrument: Instrument) => void;
  onListAlert: (alert: ListAlert, instrument: Instrument) => void;
}

function tick(inst: Instrument, now: number) {
  const reference = inst.last ?? inst.previousClose;
  if (reference == null) return false;
  const direction = Math.random() > 0.5 ? 1 : -1;
  const ticks = 1 + Math.floor(Math.random() * 3);
  const step = Math.max(inst.tickSize, reference * 0.0007);
  const last = Math.max(inst.tickSize, roundPrice(reference + direction * step * ticks, inst.tickSize));
  const qty = Math.round(50 + Math.random() * 1500);
  const half = inst.tickSize * (1 + Math.floor(Math.random() * 2));

  inst.lastTick = last > reference ? 1 : last < reference ? -1 : 0;
  inst.last = last;
  if (inst.previousClose != null) {
    inst.netChange = last - inst.previousClose;
    inst.changePercent = (inst.netChange / inst.previousClose) * 100;
  }
  inst.open = inst.open ?? last;
  inst.high = Math.max(inst.high ?? last, last);
  inst.low = Math.min(inst.low ?? last, last);
  inst.bidPrice = roundPrice(last - half, inst.tickSize);
  inst.askPrice = roundPrice(last + half, inst.tickSize);
  inst.spread = inst.askPrice - inst.bidPrice;
  inst.bidQty = Math.round(100 + Math.random() * 9000);
  inst.askQty = Math.round(100 + Math.random() * 9000);
  inst.volume = (inst.volume ?? 0) + qty;
  inst.amount = (inst.amount ?? 0) + qty * last;
  inst.lastTradeAt = now;
  // New array identity so the memoized sparkline cell re-renders only for this row.
  inst.intraday = [...inst.intraday.slice(-(INTRADAY_POINTS - 1)), last];
  return true;
}

/**
 * Simulated market data feed (WL-14). Ticks are applied with `apiRef.updateRows`, so only the
 * touched rows re-render and the React tree above the grid is never invalidated by a tick.
 */
export function useLiveFeed({
  sinkRef,
  instruments,
  byOrderbook,
  activeIdsRef,
  enabled,
  ticksPerSecond = DEFAULT_TICKS_PER_SECOND,
  measure = false,
  priceAlertsRef,
  listAlertRef,
  onPriceAlert,
  onListAlert,
}: LiveFeedOptions) {
  const callbacks = useRef({ onPriceAlert, onListAlert });
  useEffect(() => {
    callbacks.current = { onPriceAlert, onListAlert };
  }, [onPriceAlert, onListAlert]);

  const syntheticAst = useRef(new Map<number, FormulaNode>());

  useEffect(() => {
    if (!enabled) return;
    const interval = window.setInterval(() => {
      const ids = activeIdsRef.current;
      if (ids.length === 0) return;

      const now = Date.now();
      const touched = new Set<number>();
      const ticksPerBatch = Math.max(1, Math.round((ticksPerSecond * TICK_INTERVAL_MS) / 1000));
      for (let n = 0; n < ticksPerBatch; n += 1) {
        const inst = instruments.get(ids[Math.floor(Math.random() * ids.length)]);
        if (!inst || inst.syntheticExpression || !inst.hasPermission || inst.status !== "ENABLED") continue;
        if (inst.session === "Cerrado" || inst.session === "Pre-apertura") continue;
        // Delayed feeds publish far less often.
        if (inst.quality === "delayed" && Math.random() < 0.75) continue;
        if (tick(inst, now)) touched.add(inst.id);
      }

      // Synthetic instruments are recomputed from their legs on every batch.
      for (const id of ids) {
        const inst = instruments.get(id);
        if (!inst?.syntheticExpression) continue;
        let ast = syntheticAst.current.get(id);
        if (!ast) {
          const parsed = parseFormula(inst.syntheticExpression);
          if (!parsed.ok) continue;
          ast = parsed.ast;
          syntheticAst.current.set(id, ast);
        }
        const value = evaluateFormula(ast, inst, (orderbook) => byOrderbook.get(orderbook));
        if (value == null || value === inst.last) continue;
        inst.lastTick = inst.last == null ? 0 : value > inst.last ? 1 : -1;
        inst.last = value;
        if (inst.previousClose != null && inst.previousClose !== 0) {
          inst.netChange = value - inst.previousClose;
          inst.changePercent = (inst.netChange / Math.abs(inst.previousClose)) * 100;
        }
        inst.lastTradeAt = now;
        inst.intraday = [...inst.intraday.slice(-(INTRADAY_POINTS - 1)), value];
        touched.add(id);
      }

      if (touched.size === 0) return;

      for (const alert of priceAlertsRef.current) {
        if (alert.status !== "active" || !touched.has(alert.instrumentId)) continue;
        const inst = instruments.get(alert.instrumentId);
        if (inst?.last == null) continue;
        if ((alert.op === ">=" && inst.last >= alert.price) || (alert.op === "<=" && inst.last <= alert.price)) {
          callbacks.current.onPriceAlert(alert, inst);
        }
      }
      const listAlert = listAlertRef.current;
      if (listAlert) {
        for (const id of touched) {
          const inst = instruments.get(id);
          if (inst?.changePercent == null || listAlert.fired.includes(id)) continue;
          if (Math.abs(inst.changePercent) >= listAlert.thresholdPercent) callbacks.current.onListAlert(listAlert, inst);
        }
      }

      const sink = sinkRef.current;
      if (!sink) return;
      const updates = Array.from(touched).map((id) => ({ ...instruments.get(id)! }));
      if (updates.length === 0) return;
      const started = measure ? performance.now() : 0;
      sink.push(updates);
      const counters = measure ? window.__wlBench : undefined;
      if (counters) {
        const elapsed = performance.now() - started;
        counters.batches += 1;
        counters.ticks += touched.size;
        counters.rowsPushed += updates.length;
        counters.updateRowsMs += elapsed;
        counters.maxUpdateRowsMs = Math.max(counters.maxUpdateRowsMs, elapsed);
      }
    }, TICK_INTERVAL_MS);
    return () => window.clearInterval(interval);
  }, [enabled, ticksPerSecond, measure, sinkRef, instruments, byOrderbook, activeIdsRef, priceAlertsRef, listAlertRef]);
}
