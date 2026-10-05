import type {
  CalculatedColumn,
  ConditionalRule,
  Flag,
  ListAlert,
  PriceAlert,
  WatchList,
  WatchlistSettings,
} from "./model";

/**
 * Persisted watchlist preferences (WL-33). Versioned so a schema change can migrate or discard
 * old payloads instead of crashing. In production this belongs to a user-preferences service
 * (to follow the user across devices); localStorage stands in for it in this demo.
 *
 * Each watchlist widget uses its own key. The grid-specific part (column layout) is opaque here:
 * every grid implementation (MUI X, AG Grid) stores its own format in `view.layout`.
 */
export const STORAGE_KEY = "nuam.tws.watchlist";
export const STORAGE_VERSION = 2;

export type ColumnVisibility = Record<string, boolean>;

export interface ColumnTemplate {
  id: string;
  name: string;
  builtIn: boolean;
  visibility: ColumnVisibility;
  /** Grid-specific column order/widths/pinning captured when the template was saved. */
  layout?: unknown;
}

export interface SyntheticDefinition {
  id: number;
  name: string;
  expression: string;
}

export interface PersistedView {
  columnVisibility: ColumnVisibility;
  templates: ColumnTemplate[];
  layout?: unknown;
}

export interface PersistedWatchlist {
  version: typeof STORAGE_VERSION;
  lists: WatchList[];
  activeListId: string;
  flags: Record<number, Flag>;
  priceAlerts: PriceAlert[];
  listAlerts: ListAlert[];
  rules: ConditionalRule[];
  calculatedColumns: CalculatedColumn[];
  synthetics: SyntheticDefinition[];
  settings: WatchlistSettings;
  view: PersistedView;
}

interface PersistedWatchlistV1 extends Omit<PersistedWatchlist, "version" | "view"> {
  version: 1;
  columnVisibility: ColumnVisibility;
  templates: { id: string; name: string; builtIn: boolean; visibility: ColumnVisibility; gridState?: unknown }[];
  gridState?: unknown;
}

function migrate(raw: unknown): PersistedWatchlist | null {
  const data = raw as Partial<PersistedWatchlist> | Partial<PersistedWatchlistV1> | null;
  if (!data || !Array.isArray(data.lists)) return null;
  if (data.version === STORAGE_VERSION) return data as PersistedWatchlist;
  if (data.version === 1) {
    const { columnVisibility, templates, gridState, ...rest } = data as PersistedWatchlistV1;
    return {
      ...rest,
      version: STORAGE_VERSION,
      view: {
        columnVisibility,
        templates: templates.map(({ gridState: layout, ...t }) => ({ ...t, layout })),
        layout: gridState,
      },
    };
  }
  return null;
}

export function loadWatchlist(key = STORAGE_KEY): PersistedWatchlist | null {
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? migrate(JSON.parse(raw)) : null;
  } catch {
    return null;
  }
}

export function saveWatchlist(state: PersistedWatchlist, key = STORAGE_KEY) {
  try {
    window.localStorage.setItem(key, JSON.stringify(state));
  } catch {
    // Quota exceeded or storage disabled: preferences simply won't survive the session.
  }
}

export function clearWatchlist(key = STORAGE_KEY) {
  try {
    window.localStorage.removeItem(key);
  } catch {
    // ignore
  }
}
