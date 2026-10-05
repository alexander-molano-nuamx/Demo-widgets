import type { GridColumnVisibilityModel, GridInitialState } from "@mui/x-data-grid-pro";
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
 * Persisted watchlist preferences (WL-33). Versioned so a future schema change can migrate
 * or discard old payloads instead of crashing. In production this belongs to a user-preferences
 * service (to follow the user across devices); localStorage stands in for it in this demo.
 */
export const STORAGE_KEY = "nuam.tws.watchlist";
export const STORAGE_VERSION = 1;

export interface ColumnTemplate {
  id: string;
  name: string;
  builtIn: boolean;
  visibility: GridColumnVisibilityModel;
  gridState?: Pick<GridInitialState, "columns" | "pinnedColumns">;
}

export interface SyntheticDefinition {
  id: number;
  name: string;
  expression: string;
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
  templates: ColumnTemplate[];
  columnVisibility: GridColumnVisibilityModel;
  gridState?: GridInitialState;
  settings: WatchlistSettings;
}

export function loadWatchlist(): PersistedWatchlist | null {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<PersistedWatchlist>;
    if (parsed.version !== STORAGE_VERSION || !Array.isArray(parsed.lists)) return null;
    return parsed as PersistedWatchlist;
  } catch {
    return null;
  }
}

export function saveWatchlist(state: PersistedWatchlist) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Quota exceeded or storage disabled: preferences simply won't survive the session.
  }
}

export function clearWatchlist() {
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}
