/**
 * Performance harness for the watchlist PoC ("N instrumentos con ticks en vivo y flash").
 * Enabled only through the URL: /workstation?bench=1000&tps=100
 *   bench  number of instruments in a read-only "Benchmark" list (100–5000)
 *   tps    simulated ticks per second (1–5000); default is the normal demo rate
 * In bench mode nothing is persisted, and the feed exposes counters on `window.__wlBench`.
 */
export interface BenchConfig {
  size: number;
  ticksPerSecond: number;
}

export interface BenchCounters {
  batches: number;
  ticks: number;
  rowsPushed: number;
  updateRowsMs: number;
  maxUpdateRowsMs: number;
}

declare global {
  interface Window {
    __wlBench?: BenchCounters;
  }
}

export const DEFAULT_TICKS_PER_SECOND = 24;

function clampInt(raw: string | null, min: number, max: number) {
  const value = Math.round(Number(raw));
  return Number.isFinite(value) && value >= min ? Math.min(value, max) : null;
}

export function readBenchConfig(): BenchConfig | null {
  if (typeof window === "undefined") return null;
  const params = new URLSearchParams(window.location.search);
  const size = clampInt(params.get("bench"), 100, 5000);
  if (size == null) return null;
  return { size, ticksPerSecond: clampInt(params.get("tps"), 1, 5000) ?? DEFAULT_TICKS_PER_SECOND };
}

export function resetBenchCounters() {
  window.__wlBench = { batches: 0, ticks: 0, rowsPushed: 0, updateRowsMs: 0, maxUpdateRowsMs: 0 };
}
