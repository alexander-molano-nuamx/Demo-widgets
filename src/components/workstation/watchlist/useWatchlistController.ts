"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type RefObject } from "react";
import { useMediaQuery, useTheme } from "@mui/material";
import {
  MAX_ITEMS_PER_LIST,
  exchangeByCountry,
  type ConditionalRule,
  type DemoState,
  type Flag,
  type Instrument,
  type ListAlert,
  type ListItem,
  type PriceAlert,
  type WatchList,
  type WatchlistRow,
  type WatchlistSettings,
} from "@/lib/watchlist/model";
import { SYNTHETIC_ID_BASE, createSyntheticInstrument, createUniverse } from "@/lib/watchlist/universe";
import {
  CORE_PROFILE_HIDDEN,
  createRandom,
  readBenchConfig,
  resetBenchCounters,
  type BenchWidget,
} from "@/lib/watchlist/benchmark";
import {
  STORAGE_VERSION,
  clearWatchlist,
  loadWatchlist,
  saveWatchlist,
  type ColumnTemplate,
  type ColumnVisibility,
  type SyntheticDefinition,
} from "@/lib/watchlist/persistence";
import { responsiveHiddenFields } from "./columns";
import type { OrderResult } from "./dialogs";
import { LINK_EVENT, type LinkEventDetailV1 } from "./LinkGroupSelector";
import type { OverlayKind } from "./overlays";
import { useLiveFeed, type TickSink } from "./useLiveFeed";
import type { TicketSide, WatchlistActions } from "./WatchlistContext";

/**
 * What a grid implementation (MUI X, AG Grid) must provide to the shared watchlist. Everything
 * else — lists, flags, alerts, rules, synthetics, settings, dialogs, persistence — is shared.
 */
export interface GridAdapter extends TickSink {
  /** Grid-specific column layout (order, widths, pinning, sort, filters…) to persist. */
  captureLayout(): unknown;
  applyLayout(layout: unknown): void;
  /** Back to the default layout (typically by re-mounting the grid). */
  resetLayout(): void;
  clearGridFilters(): void;
  exportCsv(fileName: string): void;
  openFilters(): void;
  openColumnsPanel(): void;
  /** Open the grid's calculated-column editor (MUI: shared formula dialog; AG Grid: native). */
  createCalculatedColumn(): void;
}

export interface WatchlistControllerOptions {
  storageKey: string;
  defaultVisibility: ColumnVisibility;
  adapterRef: RefObject<GridAdapter | null>;
  /** Which grid this controller drives; names its benchmark counters (`window.__wlBench[benchId]`). */
  benchId: BenchWidget;
}

export const defaultSettings: WatchlistSettings = { density: "compact", flashMs: 900, viewMode: "auto", linkGroup: "none" };
export const defaultRules: ConditionalRule[] = [
  { id: "rule-up", field: "changePercent", op: ">=", value: 3, style: "up" },
  { id: "rule-down", field: "changePercent", op: "<=", value: -3, style: "down" },
];
export const demoStateLabel: Record<DemoState, string> = {
  normal: "Normal",
  loading: "Cargando",
  error: "Error de carga",
  disconnected: "Conexión perdida",
  "market-closed": "Mercado cerrado",
  "no-permission": "Sin permiso",
};

const CARD_BREAKPOINT = 560;
let feedbackSeq = 0;

export type FeedbackSeverity = OrderResult["severity"] | "info";
export interface PromptState {
  title: string;
  label: string;
  initial?: string;
  onSubmit: (value: string) => void;
}

export function matchesRule(value: unknown, rule: ConditionalRule) {
  if (typeof value !== "number") return false;
  if (rule.op === ">") return value > rule.value;
  if (rule.op === ">=") return value >= rule.value;
  if (rule.op === "<") return value < rule.value;
  return value <= rule.value;
}

/** Shared control plane of a watchlist widget. The grid only renders `rows` and reports back. */
export function useWatchlistController({ storageKey, defaultVisibility, adapterRef, benchId }: WatchlistControllerOptions) {
  const theme = useTheme();
  const isPhone = useMediaQuery(theme.breakpoints.down("sm"));

  // ---- Data plane: the instrument universe is mutated in place by the feed, outside React state.
  const [bench] = useState(() => readBenchConfig());
  const [persisted] = useState(() => (bench ? null : loadWatchlist(storageKey)));
  const [universe] = useState(() => {
    const u = createUniverse(bench?.size);
    if (bench) {
      // Read-only list with the first N instruments (realistic mix of classes, sessions and
      // entitlements), grouped by market like the real list.
      const sectionByCountry = { CL: "Chile · BCS", PE: "Perú · BVL", CO: "Colombia · BVC" } as const;
      const items = Array.from(u.instruments.values())
        .slice(0, bench.size)
        .sort((a, b) => a.country.localeCompare(b.country))
        .map((inst) => ({ id: inst.id, section: sectionByCountry[inst.country] }));
      u.defaultLists.unshift({ id: "sys-bench", name: `Benchmark ${bench.size}`, kind: "system", items });
      resetBenchCounters(benchId);
    }
    const byOrderbook = new Map(Array.from(u.instruments.values()).map((i) => [i.orderbook, i]));
    for (const def of persisted?.synthetics ?? []) {
      const inst = createSyntheticInstrument(def, byOrderbook);
      if (inst) {
        u.instruments.set(inst.id, inst);
        byOrderbook.set(inst.orderbook, inst);
      }
    }
    return { ...u, byOrderbook };
  });
  const { instruments, byOrderbook } = universe;
  const resolve = useCallback((orderbook: string) => byOrderbook.get(orderbook), [byOrderbook]);

  // ---- Control plane: user configuration, persisted between sessions (WL-33).
  const [lists, setLists] = useState<WatchList[]>(persisted?.lists ?? universe.defaultLists);
  const [activeListId, setActiveListId] = useState(bench ? "sys-bench" : (persisted?.activeListId ?? "renta-variable"));
  const [flags, setFlags] = useState<Record<number, Flag>>(persisted?.flags ?? universe.initialFlags);
  const [priceAlerts, setPriceAlerts] = useState<PriceAlert[]>(persisted?.priceAlerts ?? []);
  const [listAlerts, setListAlerts] = useState<ListAlert[]>(persisted?.listAlerts ?? []);
  const [rules, setRules] = useState<ConditionalRule[]>(persisted?.rules ?? defaultRules);
  const [calculatedColumns, setCalculatedColumns] = useState(persisted?.calculatedColumns ?? []);
  const [synthetics, setSynthetics] = useState<SyntheticDefinition[]>(persisted?.synthetics ?? []);
  const [templates, setTemplates] = useState<ColumnTemplate[]>(persisted?.view.templates ?? []);
  const [columnVisibility, setColumnVisibility] = useState<ColumnVisibility>(() =>
    bench?.profile === "core"
      ? { ...defaultVisibility, ...Object.fromEntries(CORE_PROFILE_HIDDEN.map((field) => [field, false])) }
      : (persisted?.view.columnVisibility ?? defaultVisibility),
  );
  // Benchmark runs use a seeded generator so both grids receive exactly the same tick stream.
  const [random] = useState(() => (bench ? createRandom(bench.seed) : Math.random));
  const [settings, setSettings] = useState<WatchlistSettings>({ ...defaultSettings, ...persisted?.settings });
  /** Layout to apply when the grid (re-)mounts: last saved one, or none after a reset. */
  const [initialLayout, setInitialLayout] = useState<unknown>(persisted?.view.layout);
  const [layoutVersion, setLayoutVersion] = useState(0);

  // ---- Transient UI state.
  const [demoState, setDemoStateRaw] = useState<DemoState>("normal");
  const [disconnectedAt, setDisconnectedAt] = useState<number | null>(null);
  const [listLoading, setListLoading] = useState(false);
  const [quickFilter, setQuickFilter] = useState("");
  const [flagFilter, setFlagFilter] = useState<Flag | "any" | "all">("all");
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; row: WatchlistRow } | null>(null);
  const [ticket, setTicket] = useState<{ row: WatchlistRow; side: TicketSide } | null>(null);
  const [alertTarget, setAlertTarget] = useState<WatchlistRow | "list" | null>(null);
  const [rulesOpen, setRulesOpen] = useState(false);
  const [syntheticOpen, setSyntheticOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [prompt, setPrompt] = useState<PromptState | null>(null);
  const [confirmReset, setConfirmReset] = useState(false);
  const [feedback, setFeedback] = useState<{ id: number; severity: FeedbackSeverity; message: string }[]>([]);
  const [announcement, setAnnouncement] = useState("");
  const [linkedTo, setLinkedTo] = useState<string | null>(null);
  const [width, setWidth] = useState(1600);
  // Callback ref: PanelWindow re-mounts its content in a portal when maximized, so the observed
  // node changes and the ResizeObserver must follow it.
  const [rootEl, setRootEl] = useState<HTMLDivElement | null>(null);

  const activeList = lists.find((l) => l.id === activeListId) ?? lists[0];
  const readOnly = activeList.kind === "system";
  const cards = settings.viewMode === "cards" || (settings.viewMode === "auto" && (width < CARD_BREAKPOINT || isPhone));
  const listFull = activeList.items.length >= MAX_ITEMS_PER_LIST;
  const filtersActive = quickFilter.trim() !== "" || flagFilter !== "all";
  const listBlocked = demoState === "no-permission" || Boolean(activeList.requiresPermission);

  // ---- Feedback in context (WL-39) + screen-reader announcements (WL-40).
  const notify = useCallback((severity: FeedbackSeverity, message: string) => {
    feedbackSeq += 1;
    const id = feedbackSeq;
    setFeedback((prev) => [...prev.slice(-2), { id, severity, message }]);
    setAnnouncement(message);
    window.setTimeout(() => setFeedback((prev) => prev.filter((f) => f.id !== id)), 4500);
  }, []);
  const dismissFeedback = useCallback((id: number) => setFeedback((prev) => prev.filter((f) => f.id !== id)), []);

  // ---- Responsive behaviour (WL-31/32): measure the widget, not the window.
  useEffect(() => {
    if (!rootEl) return;
    const observer = new ResizeObserver(([entry]) => {
      // A detached node reports 0 while the panel moves to/from the maximized portal.
      if (entry.contentRect.width > 0) setWidth(Math.round(entry.contentRect.width / 10) * 10);
    });
    observer.observe(rootEl);
    return () => observer.disconnect();
  }, [rootEl]);
  const responsiveHidden = useMemo(() => responsiveHiddenFields(width), [width]);
  const effectiveVisibility = useMemo(() => {
    const model = { ...columnVisibility };
    for (const field of responsiveHidden) model[field] = false;
    return model;
  }, [columnVisibility, responsiveHidden]);

  /** Grid reports a user visibility change; auto-hidden columns must not leak into the preference. */
  const updateColumnVisibility = useCallback(
    (model: ColumnVisibility) => {
      setColumnVisibility((prev) => {
        const next = { ...model };
        for (const field of responsiveHidden) {
          if (prev[field] === undefined) delete next[field];
          else next[field] = prev[field];
        }
        return next;
      });
    },
    [responsiveHidden],
  );

  // ---- Rows: list membership × instrument snapshot. Ticks bypass this through the adapter.
  const alertStatusById = useMemo(() => new Map(priceAlerts.map((a) => [a.instrumentId, a.status])), [priceAlerts]);
  const rows: WatchlistRow[] = useMemo(() => {
    if (demoState === "error" || listBlocked) return [];
    const q = quickFilter.trim().toUpperCase();
    return activeList.items.flatMap((item) => {
      const inst = instruments.get(item.id);
      if (!inst) return [];
      const flag = flags[item.id] ?? "none";
      if (flagFilter === "any" && flag === "none") return [];
      if (flagFilter !== "all" && flagFilter !== "any" && flag !== flagFilter) return [];
      if (q && !inst.orderbook.includes(q) && !inst.description.toUpperCase().includes(q)) return [];
      return [{ ...inst, section: item.section, flag, alert: alertStatusById.get(item.id) ?? "none" }];
    });
  }, [activeList, flags, flagFilter, quickFilter, alertStatusById, demoState, listBlocked, instruments]);

  const activeIdsRef = useRef<number[]>([]);
  const priceAlertsRef = useRef<PriceAlert[]>(priceAlerts);
  const listAlertRef = useRef<ListAlert | null>(null);
  const selectedIdsRef = useRef<number[]>([]);
  useEffect(() => {
    activeIdsRef.current = rows.map((r) => r.id);
  }, [rows]);
  // The grid re-mounts after minimize/maximize with the memoized snapshot; push current prices.
  useEffect(() => {
    if (!rootEl) return;
    adapterRef.current?.push(activeIdsRef.current.map((id) => ({ ...instruments.get(id)! })));
  }, [rootEl, adapterRef, instruments]);
  useEffect(() => {
    priceAlertsRef.current = priceAlerts;
  }, [priceAlerts]);
  useEffect(() => {
    selectedIdsRef.current = selectedIds;
  }, [selectedIds]);
  const activeListAlert = listAlerts.find((a) => a.listId === activeList.id) ?? null;
  useEffect(() => {
    listAlertRef.current = activeListAlert;
  }, [activeListAlert]);

  const onPriceAlert = useCallback(
    (alert: PriceAlert, inst: Instrument) => {
      alert.status = "triggered"; // avoid re-firing before the state update lands
      setPriceAlerts((prev) => prev.map((a) => (a.instrumentId === alert.instrumentId ? { ...a, status: "triggered" } : a)));
      notify("warning", `Alerta disparada: ${inst.orderbook} ${alert.op} ${alert.price.toFixed(inst.decimals)}`);
    },
    [notify],
  );
  const onListAlert = useCallback(
    (alert: ListAlert, inst: Instrument) => {
      alert.fired.push(inst.id);
      setListAlerts((prev) => prev.map((a) => (a.listId === alert.listId ? { ...a, fired: [...alert.fired] } : a)));
      notify("info", `Alerta de lista: ${inst.orderbook} varía ${inst.changePercent?.toFixed(2)}% (umbral ±${alert.thresholdPercent}%)`);
    },
    [notify],
  );

  useLiveFeed({
    sinkRef: adapterRef,
    instruments,
    byOrderbook,
    activeIdsRef,
    // In an isolated benchmark only the selected widget's feed runs.
    enabled: demoState === "normal" && !listLoading && (!bench?.widget || bench.widget === benchId),
    ticksPerSecond: bench?.ticksPerSecond,
    measure: bench ? benchId : null,
    random,
    priceAlertsRef,
    listAlertRef,
    onPriceAlert,
    onListAlert,
  });

  // ---- Persistence (debounced). The grid calls `layoutChanged` when its layout changes.
  useEffect(() => {
    if (bench) return; // benchmark runs must not overwrite the user's saved configuration
    const timer = window.setTimeout(() => {
      const layout = adapterRef.current?.captureLayout();
      // Keep the latest layout as the initial one for the next mount (maximize re-mounts the grid).
      if (layout !== undefined) setInitialLayout(layout);
      saveWatchlist(
        {
          version: STORAGE_VERSION,
          lists,
          activeListId,
          flags,
          priceAlerts,
          listAlerts,
          rules,
          calculatedColumns,
          synthetics,
          settings,
          view: { columnVisibility, templates, layout },
        },
        storageKey,
      );
    }, 400);
    return () => window.clearTimeout(timer);
  }, [bench, storageKey, adapterRef, lists, activeListId, flags, priceAlerts, listAlerts, rules, calculatedColumns, synthetics, templates, columnVisibility, settings, layoutVersion]);
  const layoutChanged = useCallback(() => setLayoutVersion((v) => v + 1), []);

  // ---- List membership operations.
  const updateList = useCallback((listId: string, fn: (items: ListItem[]) => ListItem[]) => {
    setLists((prev) => prev.map((l) => (l.id === listId ? { ...l, items: fn(l.items) } : l)));
  }, []);

  const addToList = useCallback(
    (listId: string, ids: number[]) => {
      const target = lists.find((l) => l.id === listId);
      if (!target || target.kind === "system") return { added: 0, duplicated: 0, overflow: 0 };
      const present = new Set(target.items.map((i) => i.id));
      const fresh = Array.from(new Set(ids)).filter((id) => !present.has(id) && instruments.has(id));
      const room = Math.max(0, MAX_ITEMS_PER_LIST - target.items.length);
      const accepted = fresh.slice(0, room);
      if (accepted.length > 0) updateList(listId, (items) => [...accepted.map((id) => ({ id, section: null })), ...items]);
      return { added: accepted.length, duplicated: ids.length - fresh.length, overflow: fresh.length - accepted.length };
    },
    [lists, instruments, updateList],
  );

  const reportAdd = useCallback(
    (result: { added: number; duplicated: number; overflow: number }, listName: string, extra = "") => {
      const parts = [`${result.added} agregado(s) a ${listName}`];
      if (result.duplicated) parts.push(`${result.duplicated} ya estaban`);
      if (result.overflow) parts.push(`${result.overflow} no caben (máx. ${MAX_ITEMS_PER_LIST})`);
      if (extra) parts.push(extra);
      notify(result.overflow ? "warning" : result.added ? "success" : "info", parts.join(" · "));
    },
    [notify],
  );

  const removeFromList = useCallback(
    (ids: number[]) => {
      if (readOnly) return;
      const drop = new Set(ids);
      updateList(activeList.id, (items) => items.filter((i) => !drop.has(i.id)));
      setSelectedIds([]);
      notify("info", `${ids.length} instrumento(s) quitado(s) de ${activeList.name}`);
    },
    [readOnly, updateList, activeList, notify],
  );

  const setSection = useCallback(
    (ids: number[], section: string | null) => {
      const move = new Set(ids);
      updateList(activeList.id, (items) => {
        const moved = items.filter((i) => move.has(i.id)).map((i) => ({ ...i, section }));
        const rest = items.filter((i) => !move.has(i.id));
        // Keep sections contiguous: insert moved items after the last item of that section.
        const lastIndex = rest.map((i) => i.section).lastIndexOf(section);
        return lastIndex === -1 ? [...rest, ...moved] : [...rest.slice(0, lastIndex + 1), ...moved, ...rest.slice(lastIndex + 1)];
      });
    },
    [activeList.id, updateList],
  );

  /** Replace the active list's order after a row drag in the grid (WL-03). */
  const reorderActiveList = useCallback((ordered: ListItem[]) => updateList(activeList.id, () => ordered), [activeList.id, updateList]);

  const importTickers = useCallback(
    (tickers: string[]) => {
      const ids: number[] = [];
      const unknown: string[] = [];
      for (const t of tickers) {
        const inst = byOrderbook.get(t);
        if (inst) ids.push(inst.id);
        else unknown.push(t);
      }
      const result = addToList(activeList.id, ids);
      reportAdd(result, activeList.name, unknown.length ? `${unknown.length} no encontrado(s): ${unknown.slice(0, 4).join(", ")}${unknown.length > 4 ? "…" : ""}` : "");
    },
    [byOrderbook, addToList, activeList, reportAdd],
  );

  const selectList = useCallback((id: string) => {
    setActiveListId(id);
    setSelectedIds([]);
    setListLoading(true);
    window.setTimeout(() => setListLoading(false), 350);
  }, []);

  const createList = useCallback(() => {
    const id = `list-${Date.now().toString(36)}`;
    setLists((prev) => [...prev, { id, name: `Lista ${prev.filter((l) => l.kind === "user").length + 1}`, kind: "user", items: [] }]);
    selectList(id);
    return id;
  }, [selectList]);

  const renameList = useCallback((id: string, name: string) => setLists((prev) => prev.map((l) => (l.id === id ? { ...l, name } : l))), []);

  const duplicateList = useCallback(
    (id: string) => {
      const source = lists.find((l) => l.id === id);
      if (!source) return;
      const copy: WatchList = {
        id: `list-${Date.now().toString(36)}`,
        name: `${source.name} (copia)`.slice(0, 40),
        kind: "user",
        items: source.items.map((i) => ({ ...i })),
      };
      setLists((prev) => [...prev, copy]);
      selectList(copy.id);
      notify("success", `Lista "${copy.name}" creada`);
    },
    [lists, selectList, notify],
  );

  const deleteList = useCallback(
    (id: string) => {
      const target = lists.find((l) => l.id === id);
      setLists((prev) => prev.filter((l) => l.id !== id));
      if (id === activeListId) selectList(lists.find((l) => l.id !== id)?.id ?? "renta-variable");
      notify("info", `Lista "${target?.name ?? ""}" eliminada`);
    },
    [lists, activeListId, selectList, notify],
  );

  // ---- Linking (WL-23): publish the selected instrument to the widgets of the same color group.
  const publishLink = useCallback(
    (row: WatchlistRow) => {
      if (settings.linkGroup === "none") return;
      const detail: LinkEventDetailV1 = {
        version: 1,
        group: settings.linkGroup,
        instrumentId: row.id,
        orderbook: row.orderbook,
        country: row.country,
      };
      window.dispatchEvent(new CustomEvent(LINK_EVENT, { detail }));
      setLinkedTo(row.orderbook);
    },
    [settings.linkGroup],
  );

  const cycleFlag = useCallback((id: number) => {
    const order: Flag[] = ["none", "green", "yellow", "red", "blue"];
    setFlags((prev) => ({ ...prev, [id]: order[(order.indexOf(prev[id] ?? "none") + 1) % order.length] }));
  }, []);
  const setFlag = useCallback((id: number, flag: Flag) => setFlags((prev) => ({ ...prev, [id]: flag })), []);

  const openContextMenu = useCallback((row: WatchlistRow, x: number, y: number) => setContextMenu({ row, x, y }), []);
  /** Latest market snapshot for a row (the row object the grid holds may be older). */
  const fresh = useCallback((row: WatchlistRow): WatchlistRow => ({ ...row, ...instruments.get(row.id) }), [instruments]);

  const actions: WatchlistActions = useMemo(
    () => ({
      demoState,
      readOnly,
      activeListId: activeList.id,
      openTicket: (row, side) => setTicket({ row: fresh(row), side }),
      openAlert: (row) => setAlertTarget(fresh(row)),
      setFlag,
      cycleFlag,
      requestAccess: (row) => notify("success", `Solicitud de acceso a datos ${exchangeByCountry[row.country].code} enviada (demo)`),
      renameSection: (section) =>
        setPrompt({
          title: "Renombrar sección",
          label: "Nombre de la sección",
          initial: section,
          onSubmit: (name) => updateList(activeList.id, (items) => items.map((i) => (i.section === section ? { ...i, section: name } : i))),
        }),
      openContextMenu,
      dragIdsFor: (id) => (selectedIdsRef.current.includes(id) ? selectedIdsRef.current : [id]),
    }),
    [demoState, readOnly, activeList.id, fresh, setFlag, cycleFlag, notify, updateList, openContextMenu],
  );

  /** Keyboard shortcuts shared by both grids (WL-24). Returns true when the key was handled. */
  const handleShortcut = useCallback(
    (row: WatchlistRow, key: string, openMenu: () => void) => {
      const handlers: Record<string, () => void> = {
        enter: openMenu,
        contextmenu: openMenu,
        b: () => actions.openTicket(row, "buy"),
        c: () => actions.openTicket(row, "buy"),
        s: () => actions.openTicket(row, "sell"),
        v: () => actions.openTicket(row, "sell"),
        a: () => actions.openAlert(row),
        f: () => cycleFlag(row.id),
        delete: () => removeFromList(selectedIdsRef.current.includes(row.id) ? selectedIdsRef.current : [row.id]),
      };
      const handler = handlers[key.toLowerCase()];
      handler?.();
      return Boolean(handler);
    },
    [actions, cycleFlag, removeFromList],
  );

  // ---- Templates & view (WL-08, WL-11, WL-33).
  const applyTemplate = useCallback(
    (tpl: { visibility: ColumnVisibility; layout?: unknown }) => {
      setColumnVisibility(tpl.visibility);
      if (tpl.layout !== undefined) adapterRef.current?.applyLayout(tpl.layout);
      layoutChanged();
    },
    [adapterRef, layoutChanged],
  );

  const saveTemplate = useCallback(
    (name: string) => {
      setTemplates((prev) => [
        ...prev,
        { id: `tpl-${Date.now().toString(36)}`, name, builtIn: false, visibility: columnVisibility, layout: adapterRef.current?.captureLayout() },
      ]);
      notify("success", `Plantilla "${name}" guardada`);
    },
    [adapterRef, columnVisibility, notify],
  );
  const deleteTemplate = useCallback((id: string) => setTemplates((prev) => prev.filter((t) => t.id !== id)), []);

  const resetView = useCallback(() => {
    clearWatchlist(storageKey);
    setColumnVisibility(defaultVisibility);
    setSettings(defaultSettings);
    setRules(defaultRules);
    setInitialLayout(undefined);
    setQuickFilter("");
    setFlagFilter("all");
    adapterRef.current?.resetLayout();
    notify("info", "Vista restaurada por defecto (tus listas, marcas y alertas se conservan)");
  }, [storageKey, defaultVisibility, adapterRef, notify]);

  const createSynthetic = useCallback(
    (name: string, expression: string) => {
      const id = SYNTHETIC_ID_BASE + Math.max(0, ...synthetics.map((s) => s.id - SYNTHETIC_ID_BASE)) + 1;
      const inst = createSyntheticInstrument({ id, name, expression }, byOrderbook);
      if (!inst) {
        notify("error", "No se pudo crear el instrumento sintético");
        return;
      }
      instruments.set(id, inst);
      byOrderbook.set(inst.orderbook, inst);
      setSynthetics((prev) => [...prev, { id, name, expression }]);
      const target = readOnly ? lists.find((l) => l.kind === "user") : activeList;
      if (target) reportAdd(addToList(target.id, [id]), target.name, `sintético ${inst.orderbook}`);
    },
    [synthetics, byOrderbook, instruments, notify, readOnly, lists, activeList, reportAdd, addToList],
  );

  const setDemoState = useCallback(
    (state: DemoState) => {
      setDemoStateRaw(state);
      setDisconnectedAt(state === "disconnected" ? Date.now() : null);
      notify(state === "normal" ? "success" : "info", `Estado simulado: ${demoStateLabel[state]}`);
    },
    [notify],
  );

  const clearFilters = useCallback(() => {
    setQuickFilter("");
    setFlagFilter("all");
    adapterRef.current?.clearGridFilters();
  }, [adapterRef]);

  const overlayKind: OverlayKind =
    rows.length > 0 || filtersActive ? "filtered" : demoState === "error" ? "error" : listBlocked ? "no-permission" : "empty";

  const savePriceAlert = useCallback(
    (row: WatchlistRow, op: ">=" | "<=", price: number) => {
      setPriceAlerts((prev) => [...prev.filter((a) => a.instrumentId !== row.id), { instrumentId: row.id, op, price, status: "active" }]);
      notify("success", `Alerta creada: ${row.orderbook} ${op} ${price}`);
    },
    [notify],
  );
  const deletePriceAlert = useCallback((id: number) => setPriceAlerts((prev) => prev.filter((a) => a.instrumentId !== id)), []);
  const saveListAlert = useCallback(
    (threshold: number | null) => {
      setListAlerts((prev) => [
        ...prev.filter((a) => a.listId !== activeList.id),
        ...(threshold == null ? [] : [{ listId: activeList.id, thresholdPercent: threshold, fired: [] }]),
      ]);
      notify("success", threshold == null ? "Alerta de lista eliminada" : `Alerta de lista: ±${threshold}%`);
    },
    [activeList.id, notify],
  );

  /** The grid adapter, for event handlers (never call during render). */
  const getAdapter = useCallback(() => adapterRef.current, [adapterRef]);

  return {
    getAdapter,
    // data
    instruments,
    byOrderbook,
    resolve,
    rows,
    // lists
    lists,
    activeList,
    readOnly,
    listFull,
    listBlocked,
    selectList,
    createList,
    renameList,
    duplicateList,
    deleteList,
    addToList,
    reportAdd,
    removeFromList,
    setSection,
    reorderActiveList,
    importTickers,
    // per-user marks & rules
    flags,
    priceAlerts,
    activeListAlert,
    rules,
    setRules,
    calculatedColumns,
    setCalculatedColumns,
    savePriceAlert,
    deletePriceAlert,
    saveListAlert,
    createSynthetic,
    // view
    settings,
    setSettings,
    cards,
    width,
    setRootEl,
    rootEl,
    columnVisibility,
    effectiveVisibility,
    updateColumnVisibility,
    templates,
    applyTemplate,
    saveTemplate,
    deleteTemplate,
    resetView,
    initialLayout,
    layoutChanged,
    // filters & state
    quickFilter,
    setQuickFilter,
    flagFilter,
    setFlagFilter,
    filtersActive,
    clearFilters,
    demoState,
    setDemoState,
    disconnectedAt,
    listLoading,
    overlayKind,
    // selection & interaction
    selectedIds,
    setSelectedIds,
    actions,
    handleShortcut,
    publishLink,
    linkedTo,
    setLinkedTo,
    contextMenu,
    setContextMenu,
    // dialogs
    ticket,
    setTicket,
    alertTarget,
    setAlertTarget,
    rulesOpen,
    setRulesOpen,
    syntheticOpen,
    setSyntheticOpen,
    importOpen,
    setImportOpen,
    prompt,
    setPrompt,
    confirmReset,
    setConfirmReset,
    // feedback
    notify,
    feedback,
    dismissFeedback,
    announcement,
  };
}

export type WatchlistController = ReturnType<typeof useWatchlistController>;
