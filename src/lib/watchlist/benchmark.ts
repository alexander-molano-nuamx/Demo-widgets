/**
 * Performance harness for the watchlist PoC ("N instrumentos con ticks en vivo y flash").
 * Enabled only through the URL: /workstation?bench=1000&tps=100&widget=ag&profile=core&seed=7
 *   bench    number of instruments in a read-only "Benchmark" list (100–5000)
 *   tps      simulated ticks per second (1–5000); default is the normal demo rate
 *   widget   `mui` (MUI X Pro) | `mui-premium` | `ag` (AG Grid Enterprise) | `ag-community`:
 *            render only that watchlist, full screen, without the rest of the workspace, so the
 *            grids are never measured competing for the main thread
 *   profile  `full` (default, every capability) | `core` (hides sparkline, badges and buttons,
 *            i.e. the React cell renderers, to measure the grid engine itself)
 *   seed     seed of the tick generator (default 1): all widgets receive the same tick stream
 * In bench mode nothing is persisted, and each feed exposes counters on `window.__wlBench[widget]`.
 */
export const BENCH_WIDGETS = ["mui", "mui-premium", "ag", "ag-community"] as const;
export type BenchWidget = (typeof BENCH_WIDGETS)[number];
export type BenchProfile = "full" | "core";

export interface BenchConfig {
  size: number;
  ticksPerSecond: number;
  widget: BenchWidget | null;
  profile: BenchProfile;
  seed: number;
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
    __wlBench?: Partial<Record<BenchWidget, BenchCounters>>;
  }
}

export const DEFAULT_TICKS_PER_SECOND = 24;

/** Columns rendered with React cell components; hidden in the `core` profile. */
export const CORE_PROFILE_HIDDEN = ["intraday", "session", "quality", "events", "alert", "flag", "actions"];

function clampInt(raw: string | null, min: number, max: number) {
  const value = Math.round(Number(raw));
  return Number.isFinite(value) && value >= min ? Math.min(value, max) : null;
}

export function readBenchConfig(): BenchConfig | null {
  if (typeof window === "undefined") return null;
  const params = new URLSearchParams(window.location.search);
  const size = clampInt(params.get("bench"), 100, 5000);
  if (size == null) return null;
  const widget = params.get("widget");
  return {
    size,
    ticksPerSecond: clampInt(params.get("tps"), 1, 5000) ?? DEFAULT_TICKS_PER_SECOND,
    widget: BENCH_WIDGETS.find((w) => w === widget) ?? null,
    profile: params.get("profile") === "core" ? "core" : "full",
    seed: clampInt(params.get("seed"), 1, 2 ** 31 - 1) ?? 1,
  };
}

export function resetBenchCounters(widget: BenchWidget) {
  window.__wlBench = { ...window.__wlBench, [widget]: { batches: 0, ticks: 0, rowsPushed: 0, updateRowsMs: 0, maxUpdateRowsMs: 0 } };
}

/** Deterministic PRNG (mulberry32): same seed → same sequence on every run and every widget. */
export function createRandom(seed: number) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
