"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import {
  Alert,
  Box,
  Chip,
  Divider,
  IconButton,
  ListItemIcon,
  ListItemText,
  ListSubheader,
  Menu,
  MenuItem,
  Stack,
  TextField,
  Tooltip,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import MenuIcon from "@mui/icons-material/Menu";
import DownloadIcon from "@mui/icons-material/Download";
import UploadIcon from "@mui/icons-material/Upload";
import FlagIcon from "@mui/icons-material/Flag";
import FilterListIcon from "@mui/icons-material/FilterList";
import ViewColumnIcon from "@mui/icons-material/ViewColumn";
import KeyboardIcon from "@mui/icons-material/Keyboard";
import CheckIcon from "@mui/icons-material/Check";
import DeleteIcon from "@mui/icons-material/DeleteOutlined";
import CloseIcon from "@mui/icons-material/Close";
import {
  GRID_ROOT_GROUP_ID,
  GridPreferencePanelsValue,
  gridRowTreeSelector,
  useGridApiRef,
  type GridCellParams,
  type GridColumnGroupingModel,
  type GridColumnVisibilityModel,
  type GridEventListener,
  type GridInitialState,
  type GridRowId,
  type GridRowSelectionModel,
  type GridTreeNode,
} from "@mui/x-data-grid-pro";
import { Button, DataGridPro, Typography } from "@nuam/common-fe-lib-components";
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
import { formatExchangeTime } from "@/lib/watchlist/format";
import { readBenchConfig, resetBenchCounters } from "@/lib/watchlist/benchmark";
import {
  clearWatchlist,
  loadWatchlist,
  saveWatchlist,
  STORAGE_VERSION,
  type ColumnTemplate,
  type SyntheticDefinition,
} from "@/lib/watchlist/persistence";
import { compactDataGridSx } from "./dataGridStyles";
import { PanelWindow, type PanelWindowControls } from "./panels/PanelWindow";
import {
  DEFAULT_TEMPLATE_ID,
  GROUP_LABELS,
  GroupHeader,
  buildColumns,
  buildGroupFields,
  builtInTemplates,
  groupingColDef,
  pinnedLeft,
  responsiveHiddenFields,
} from "./watchlist/columns";
import { flagColor, flagLabel } from "./watchlist/cells";
import {
  AlertDialog,
  ConfirmDialog,
  FormulaDialog,
  ImportDialog,
  OrderTicketDialog,
  PromptDialog,
  RulesDrawer,
  parseTickers,
  type OrderResult,
} from "./watchlist/dialogs";
import { InstrumentSearch } from "./watchlist/InstrumentSearch";
import { LINK_EVENT, LinkGroupSelector, linkGroupLabel, type LinkEventDetailV1 } from "./watchlist/LinkGroupSelector";
import { ListTabs, type InstrumentDragPayloadV1 } from "./watchlist/ListTabs";
import { OverlayContext, WatchlistOverlay, type OverlayKind } from "./watchlist/overlays";
import { useLiveFeed } from "./watchlist/useLiveFeed";
import { WatchlistCard } from "./watchlist/WatchlistCard";
import { WatchlistContext, type TicketSide, type WatchlistActions } from "./watchlist/WatchlistContext";
import { visuallyHidden, watchlistRootSx } from "./watchlist/tokens";

interface WatchlistPanelProps extends PanelWindowControls {
  dragHandleClassName?: string;
}

const defaultSettings: WatchlistSettings = { density: "compact", flashMs: 900, viewMode: "auto", linkGroup: "none" };
const defaultRules: ConditionalRule[] = [
  { id: "rule-up", field: "changePercent", op: ">=", value: 3, style: "up" },
  { id: "rule-down", field: "changePercent", op: "<=", value: -3, style: "down" },
];
const defaultVisibility = builtInTemplates.find((t) => t.id === DEFAULT_TEMPLATE_ID)!.visibility;
const defaultGridState: GridInitialState = { pinnedColumns: { left: pinnedLeft } };
const flashOptions = [0, 300, 600, 900, 1500, 2500];
const CARD_BREAKPOINT = 560;
const LONG_PRESS_MS = 550;
const EMPTY_SELECTION: GridRowSelectionModel = { type: "include", ids: new Set() };

const demoStateLabel: Record<DemoState, string> = {
  normal: "Normal",
  loading: "Cargando",
  error: "Error de carga",
  disconnected: "Conexión perdida",
  "market-closed": "Mercado cerrado",
  "no-permission": "Sin permiso",
};

const shortcuts = [
  ["↑ ↓ ← →", "Moverse por la grilla"],
  ["Enter", "Menú de acciones de la fila"],
  ["B / C", "Comprar (ticket a precio de venta)"],
  ["S / V", "Vender (ticket a precio de compra)"],
  ["A", "Crear alerta de precio"],
  ["F", "Cambiar marca de color"],
  ["Supr", "Quitar de la lista"],
  ["Espacio", "Seleccionar fila (Shift/Ctrl para varias)"],
  ["Ctrl+V", "Pegar nemotécnicos"],
];

function matchesRule(value: unknown, rule: ConditionalRule) {
  if (typeof value !== "number") return false;
  if (rule.op === ">") return value > rule.value;
  if (rule.op === ">=") return value >= rule.value;
  if (rule.op === "<") return value < rule.value;
  return value <= rule.value;
}

function selectedLeafIds(model: GridRowSelectionModel, rows: WatchlistRow[]): number[] {
  if (model.type === "include") return Array.from(model.ids).filter((id): id is number => typeof id === "number");
  return rows.map((r) => r.id).filter((id) => !model.ids.has(id));
}

let feedbackSeq = 0;

export function WatchlistPanel({ dragHandleClassName, ...controls }: WatchlistPanelProps) {
  const theme = useTheme();
  const isPhone = useMediaQuery(theme.breakpoints.down("sm"));
  const apiRef = useGridApiRef();

  // ---- Data plane: the instrument universe is mutated in place by the feed, outside React state.
  const [bench] = useState(() => readBenchConfig());
  const [persisted] = useState(() => (bench ? null : loadWatchlist()));
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
      resetBenchCounters();
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
  const [templates, setTemplates] = useState<ColumnTemplate[]>(persisted?.templates ?? []);
  const [columnVisibility, setColumnVisibility] = useState<GridColumnVisibilityModel>(
    persisted?.columnVisibility ?? defaultVisibility,
  );
  const [settings, setSettings] = useState<WatchlistSettings>({ ...defaultSettings, ...persisted?.settings });
  const [initialGridState, setInitialGridState] = useState<GridInitialState>(() => ({
    ...defaultGridState,
    ...persisted?.gridState,
  }));
  const [gridKey, setGridKey] = useState(0);
  const [gridStateVersion, setGridStateVersion] = useState(0);

  // ---- Transient UI state.
  const [demoState, setDemoState] = useState<DemoState>("normal");
  const [disconnectedAt, setDisconnectedAt] = useState<number | null>(null);
  const [listLoading, setListLoading] = useState(false);
  const [quickFilter, setQuickFilter] = useState("");
  const [flagFilter, setFlagFilter] = useState<Flag | "any" | "all">("all");
  const [selection, setSelection] = useState<GridRowSelectionModel>(EMPTY_SELECTION);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; row: WatchlistRow } | null>(null);
  const [ticket, setTicket] = useState<{ row: WatchlistRow; side: TicketSide } | null>(null);
  const [alertTarget, setAlertTarget] = useState<WatchlistRow | "list" | null>(null);
  const [rulesOpen, setRulesOpen] = useState(false);
  const [formulaMode, setFormulaMode] = useState<"column" | "synthetic" | null>(null);
  const [importOpen, setImportOpen] = useState(false);
  const [prompt, setPrompt] = useState<{ title: string; label: string; initial?: string; onSubmit: (v: string) => void } | null>(null);
  const [confirmReset, setConfirmReset] = useState(false);
  const [menuAnchor, setMenuAnchor] = useState<HTMLElement | null>(null);
  const [templatesAnchor, setTemplatesAnchor] = useState<HTMLElement | null>(null);
  const [flagAnchor, setFlagAnchor] = useState<HTMLElement | null>(null);
  const [bulkAnchor, setBulkAnchor] = useState<{ el: HTMLElement; mode: "list" | "section" } | null>(null);
  const [feedback, setFeedback] = useState<{ id: number; severity: OrderResult["severity"] | "info"; message: string }[]>([]);
  const [announcement, setAnnouncement] = useState("");
  const [linkedTo, setLinkedTo] = useState<string | null>(null);
  const [width, setWidth] = useState(1600);
  // Callback ref: PanelWindow re-mounts its content in a portal when maximized, so the observed
  // node changes and the ResizeObserver must follow it.
  const [rootEl, setRootEl] = useState<HTMLDivElement | null>(null);
  const searchBoxRef = useRef<HTMLDivElement>(null);

  const activeList = lists.find((l) => l.id === activeListId) ?? lists[0];
  const readOnly = activeList.kind === "system";
  const cards = settings.viewMode === "cards" || (settings.viewMode === "auto" && (width < CARD_BREAKPOINT || isPhone));
  const treeData = !cards;
  const listFull = activeList.items.length >= MAX_ITEMS_PER_LIST;
  const filtersActive = quickFilter.trim() !== "" || flagFilter !== "all";

  // ---- Feedback in context (WL-39) + screen-reader announcements (WL-40).
  const notify = useCallback((severity: OrderResult["severity"] | "info", message: string) => {
    feedbackSeq += 1;
    const id = feedbackSeq;
    setFeedback((prev) => [...prev.slice(-2), { id, severity, message }]);
    setAnnouncement(message);
    window.setTimeout(() => setFeedback((prev) => prev.filter((f) => f.id !== id)), 4500);
  }, []);

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

  const handleVisibilityChange = useCallback(
    (model: GridColumnVisibilityModel) => {
      // Do not let the auto-hidden columns leak into the user's own preference.
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

  // ---- Rows: list membership × instrument snapshot. Ticks bypass this via updateRows.
  const alertStatusById = useMemo(() => new Map(priceAlerts.map((a) => [a.instrumentId, a.status])), [priceAlerts]);
  const listBlocked = demoState === "no-permission" || Boolean(activeList.requiresPermission);
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
  useEffect(() => {
    activeIdsRef.current = rows.map((r) => r.id);
  }, [rows]);
  // The grid re-mounts after minimize/maximize with the memoized snapshot; push current prices.
  useEffect(() => {
    const api = apiRef.current;
    if (!rootEl || !api?.rootElementRef?.current?.isConnected) return;
    const fresh = activeIdsRef.current.filter((id) => api.getRow(id) != null).map((id) => ({ ...instruments.get(id)! }));
    if (fresh.length > 0) api.updateRows(fresh);
  }, [rootEl, apiRef, instruments]);
  useEffect(() => {
    priceAlertsRef.current = priceAlerts;
  }, [priceAlerts]);
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
    apiRef,
    instruments,
    byOrderbook,
    activeIdsRef,
    enabled: demoState === "normal" && !listLoading,
    ticksPerSecond: bench?.ticksPerSecond,
    measure: Boolean(bench),
    priceAlertsRef,
    listAlertRef,
    onPriceAlert,
    onListAlert,
  });

  // ---- Persistence (debounced).
  useEffect(() => {
    if (bench) return; // benchmark runs must not overwrite the user's saved configuration
    const timer = window.setTimeout(() => {
      const exported = apiRef.current?.exportState({ exportOnlyDirtyModels: true });
      const gridState: GridInitialState | undefined = exported
        ? { columns: exported.columns, pinnedColumns: exported.pinnedColumns, sorting: exported.sorting, filter: exported.filter }
        : undefined;
      // Keep the latest grid state as the initial state for the next mount (maximize re-mounts the grid).
      if (gridState) setInitialGridState({ ...defaultGridState, ...gridState });
      saveWatchlist({
        version: STORAGE_VERSION,
        lists,
        activeListId,
        flags,
        priceAlerts,
        listAlerts,
        rules,
        calculatedColumns,
        synthetics,
        templates,
        columnVisibility,
        gridState,
        settings,
      });
    }, 400);
    return () => window.clearTimeout(timer);
  }, [bench, apiRef, lists, activeListId, flags, priceAlerts, listAlerts, rules, calculatedColumns, synthetics, templates, columnVisibility, settings, gridStateVersion]);
  const bumpGridState = useCallback(() => setGridStateVersion((v) => v + 1), []);

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
      setSelection(EMPTY_SELECTION);
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
    setSelection(EMPTY_SELECTION);
    setListLoading(true);
    window.setTimeout(() => setListLoading(false), 350);
  }, []);

  const createList = useCallback(() => {
    const id = `list-${Date.now().toString(36)}`;
    setLists((prev) => [...prev, { id, name: `Lista ${prev.filter((l) => l.kind === "user").length + 1}`, kind: "user", items: [] }]);
    selectList(id);
    return id;
  }, [selectList]);

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

  // ---- Row reordering sync (WL-03): read the grid's tree back into the list model.
  const handleRowOrderChange = useCallback(() => {
    const api = apiRef.current;
    if (!api) return;
    const tree = gridRowTreeSelector(apiRef);
    const ordered: ListItem[] = [];
    const walk = (nodeId: GridRowId) => {
      const node: GridTreeNode | undefined = tree[nodeId];
      if (!node) return;
      if (node.type === "group") node.children.forEach(walk);
      else if (node.type === "leaf") {
        const row = api.getRow(node.id) as WatchlistRow | null;
        if (row) ordered.push({ id: row.id, section: row.section ?? null });
      }
    };
    walk(GRID_ROOT_GROUP_ID);
    updateList(activeList.id, () => ordered);
  }, [apiRef, activeList.id, updateList]);

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

  const selectedIds = useMemo(() => selectedLeafIds(selection, rows), [selection, rows]);
  const selectedIdsRef = useRef<number[]>([]);
  useEffect(() => {
    selectedIdsRef.current = selectedIds;
  }, [selectedIds]);

  const cycleFlag = useCallback((id: number) => {
    const order: Flag[] = ["none", "green", "yellow", "red", "blue"];
    setFlags((prev) => ({ ...prev, [id]: order[(order.indexOf(prev[id] ?? "none") + 1) % order.length] }));
  }, []);

  const openContextMenu = useCallback((row: WatchlistRow, x: number, y: number) => setContextMenu({ row, x, y }), []);

  const actions: WatchlistActions = useMemo(
    () => ({
      demoState,
      readOnly,
      activeListId: activeList.id,
      openTicket: (row, side) => setTicket({ row: { ...row, ...instruments.get(row.id) }, side }),
      openAlert: (row) => setAlertTarget({ ...row, ...instruments.get(row.id) }),
      setFlag: (id, flag) => setFlags((prev) => ({ ...prev, [id]: flag })),
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
    [demoState, readOnly, activeList.id, instruments, cycleFlag, notify, updateList, openContextMenu],
  );

  // ---- Columns.
  const columns = useMemo(() => buildColumns(calculatedColumns, resolve, treeData), [calculatedColumns, resolve, treeData]);
  const groupFields = useMemo(() => buildGroupFields(calculatedColumns, treeData), [calculatedColumns, treeData]);

  const columnGroupingModel: GridColumnGroupingModel = useMemo(
    () =>
      Object.entries(groupFields).map(([groupId, fields]) => ({
        groupId,
        headerName: GROUP_LABELS[groupId],
        renderHeaderGroup: () => <GroupHeader groupId={groupId} groupFields={groupFields} onMoved={bumpGridState} />,
        children: fields.map((field) => ({ field })),
      })),
    [groupFields, bumpGridState],
  );

  const rulesByField = useMemo(() => {
    const map = new Map<string, ConditionalRule[]>();
    for (const rule of rules) map.set(rule.field, [...(map.get(rule.field) ?? []), rule]);
    return map;
  }, [rules]);

  const getCellClassName = useCallback(
    (params: GridCellParams<WatchlistRow>) => {
      if (typeof params.id !== "number" || !params.row.hasPermission) return "";
      const rule = rulesByField.get(params.field)?.find((r) => matchesRule(params.row[params.field as keyof WatchlistRow], r));
      return rule ? `wl-cf-${rule.style}` : "";
    },
    [rulesByField],
  );

  // ---- Keyboard (WL-24) and pointer (right click, long press) interaction.
  const handleCellKeyDown: GridEventListener<"cellKeyDown"> = (params, event) => {
    if (typeof params.id !== "number" || event.ctrlKey || event.metaKey || event.altKey) return;
    const target = event.target as HTMLElement;
    if (target.closest("button, input, a") && target !== event.currentTarget) return;
    const row = params.row as WatchlistRow;
    const key = event.key.toLowerCase();
    const openMenuAtCell = () => {
      const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
      openContextMenu(row, rect.left + 8, rect.bottom);
    };
    const handlers: Record<string, () => void> = {
      enter: openMenuAtCell,
      contextmenu: openMenuAtCell,
      b: () => actions.openTicket(row, "buy"),
      c: () => actions.openTicket(row, "buy"),
      s: () => actions.openTicket(row, "sell"),
      v: () => actions.openTicket(row, "sell"),
      a: () => actions.openAlert(row),
      f: () => cycleFlag(row.id),
      delete: () => removeFromList(selectedIds.includes(row.id) ? selectedIds : [row.id]),
    };
    const handler = event.shiftKey && key === "f10" ? openMenuAtCell : handlers[key];
    if (!handler) return;
    event.preventDefault();
    (event as typeof event & { defaultMuiPrevented?: boolean }).defaultMuiPrevented = true;
    handler();
  };

  const rowFromEvent = (target: EventTarget | null) => {
    const el = (target as HTMLElement | null)?.closest<HTMLElement>(".MuiDataGrid-row");
    const id = Number(el?.getAttribute("data-id"));
    return Number.isFinite(id) ? (apiRef.current?.getRow(id) as WatchlistRow | null) : null;
  };

  const longPress = useRef<{ timer: number; x: number; y: number } | null>(null);
  const cancelLongPress = () => {
    if (longPress.current) window.clearTimeout(longPress.current.timer);
    longPress.current = null;
  };
  const handlePointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (e.pointerType !== "touch" || cards) return;
    const row = rowFromEvent(e.target);
    if (!row) return;
    const { clientX, clientY } = e;
    longPress.current = {
      x: clientX,
      y: clientY,
      timer: window.setTimeout(() => openContextMenu(row, clientX, clientY), LONG_PRESS_MS),
    };
  };
  const handlePointerMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    const lp = longPress.current;
    if (lp && Math.hypot(e.clientX - lp.x, e.clientY - lp.y) > 8) cancelLongPress();
  };

  // ---- Templates & view (WL-08, WL-11, WL-33).
  const applyTemplate = (tpl: { visibility: GridColumnVisibilityModel; gridState?: ColumnTemplate["gridState"] }) => {
    setColumnVisibility(tpl.visibility);
    if (tpl.gridState) apiRef.current?.restoreState(tpl.gridState);
    bumpGridState();
    setTemplatesAnchor(null);
  };

  const saveTemplate = (name: string) => {
    const state = apiRef.current?.exportState();
    setTemplates((prev) => [
      ...prev,
      {
        id: `tpl-${Date.now().toString(36)}`,
        name,
        builtIn: false,
        visibility: columnVisibility,
        gridState: state ? { columns: { orderedFields: state.columns?.orderedFields, dimensions: state.columns?.dimensions }, pinnedColumns: state.pinnedColumns } : undefined,
      },
    ]);
    notify("success", `Plantilla "${name}" guardada`);
  };

  const resetView = () => {
    clearWatchlist();
    setColumnVisibility(defaultVisibility);
    setSettings(defaultSettings);
    setRules(defaultRules);
    setInitialGridState(defaultGridState);
    setGridKey((k) => k + 1);
    setQuickFilter("");
    setFlagFilter("all");
    notify("info", "Vista restaurada por defecto (tus listas, marcas y alertas se conservan)");
  };

  const exportCsv = () => {
    const fields = columns
      .map((c) => c.field)
      .filter((f) => effectiveVisibility[f] !== false && !["flag", "alert", "events", "intraday", "actions"].includes(f));
    apiRef.current?.exportDataAsCsv({
      fileName: `watchlist-${activeList.name}`,
      delimiter: ";",
      utf8WithBom: true,
      fields: treeData ? ["orderbook", ...fields] : fields,
      getRowsToExport: () => rows.map((r) => r.id),
    });
  };

  // ---- Paste tickers anywhere over the grid (UI-20).
  const handlePaste = (e: React.ClipboardEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement;
    if (readOnly || target.closest("input, textarea, [contenteditable=true]")) return;
    const tickers = parseTickers(e.clipboardData.getData("text"));
    if (tickers.length === 0) return;
    e.preventDefault();
    importTickers(tickers);
  };

  const createCalculatedColumn = (name: string, expression: string) => {
    const field = `calc_${Date.now().toString(36)}` as const;
    setCalculatedColumns((prev) => [...prev, { field, name, expression }]);
    notify("success", `Columna calculada "${name}" creada`);
    // New columns land at the right edge, usually outside the viewport: bring it into view.
    window.setTimeout(() => {
      const api = apiRef.current;
      const colIndex = api?.getColumnIndex(field, true) ?? -1;
      if (api && colIndex >= 0) api.scrollToIndexes({ colIndex });
    }, 50);
  };

  const createSynthetic = (name: string, expression: string) => {
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
  };

  const overlayKind: OverlayKind =
    rows.length > 0 || filtersActive ? "filtered" : demoState === "error" ? "error" : listBlocked ? "no-permission" : "empty";
  const overlayState = useMemo(
    () => ({
      kind: overlayKind,
      onAdd: () => searchBoxRef.current?.querySelector("input")?.focus(),
      onImport: () => setImportOpen(true),
      onRetry: () => {
        setDemoState("normal");
        selectList(activeListId);
      },
      onRequestAccess: () => notify("success", "Solicitud de acceso enviada a tu administrador (demo)"),
      onClearFilters: () => {
        setQuickFilter("");
        setFlagFilter("all");
        apiRef.current?.setFilterModel({ items: [] });
      },
    }),
    [overlayKind, notify, selectList, activeListId, apiRef],
  );

  const setDemo = (state: DemoState) => {
    setDemoState(state);
    setDisconnectedAt(state === "disconnected" ? Date.now() : null);
    setMenuAnchor(null);
    notify(state === "normal" ? "success" : "info", `Estado simulado: ${demoStateLabel[state]}`);
  };

  const userLists = lists.filter((l) => l.kind === "user" && l.id !== activeList.id);
  const sections = Array.from(new Set(activeList.items.map((i) => i.section).filter((s): s is string => Boolean(s))));
  const ctxRow = contextMenu?.row;
  const existingAlert = alertTarget && alertTarget !== "list" ? priceAlerts.find((a) => a.instrumentId === alertTarget.id) : undefined;

  const menuItemSx = { fontSize: 12, minHeight: 28 };
  const check = (on: boolean) => <ListItemIcon>{on ? <CheckIcon fontSize="small" /> : null}</ListItemIcon>;

  return (
    <PanelWindow
      title="Watchlist"
      dragHandleClassName={dragHandleClassName}
      {...controls}
      headerExtra={
        <>
          <LinkGroupSelector
            value={settings.linkGroup}
            linkedTo={linkedTo}
            onChange={(group) => {
              setSettings((s) => ({ ...s, linkGroup: group }));
              setLinkedTo(null);
              notify("info", group === "none" ? "Watchlist desvinculado" : `Vinculado al ${linkGroupLabel[group].toLowerCase()}`);
            }}
          />
          <Tooltip
            title={
              <Box component="dl" sx={{ m: 0, display: "grid", gridTemplateColumns: "auto 1fr", columnGap: 1.5, rowGap: 0.25 }}>
                {shortcuts.map(([keys, label]) => (
                  <Box key={keys} sx={{ display: "contents" }}>
                    <Box component="dt" sx={{ fontWeight: 700 }}>{keys}</Box>
                    <Box component="dd" sx={{ m: 0 }}>{label}</Box>
                  </Box>
                ))}
              </Box>
            }
          >
            <IconButton size="small" sx={{ p: 0.25 }} aria-label="Atajos de teclado">
              <KeyboardIcon sx={{ fontSize: 14 }} />
            </IconButton>
          </Tooltip>
          <Tooltip title="Más opciones">
            <IconButton size="small" sx={{ p: 0.25 }} aria-label="Más opciones" onClick={(e) => setMenuAnchor(e.currentTarget)}>
              <MenuIcon sx={{ fontSize: 14 }} />
            </IconButton>
          </Tooltip>
        </>
      }
    >
      <WatchlistContext.Provider value={actions}>
        <OverlayContext.Provider value={overlayState}>
          <Box
            ref={setRootEl}
            className={settings.flashMs === 0 ? "wl-no-flash" : undefined}
            sx={(t) => watchlistRootSx(t, settings.flashMs)}
            onPaste={handlePaste}
          >
            {/* Row 1: lists */}
            <Stack direction="row" sx={{ alignItems: "center", px: 1, pt: 0.5, gap: 1 }}>
              <ListTabs
                lists={lists}
                activeListId={activeList.id}
                onSelect={selectList}
                onCreate={createList}
                onRename={(id, name) => setLists((prev) => prev.map((l) => (l.id === id ? { ...l, name } : l)))}
                onDuplicate={duplicateList}
                onDelete={deleteList}
                onDropInstruments={(listId, payload: InstrumentDragPayloadV1) => {
                  const target = lists.find((l) => l.id === listId);
                  if (target) reportAdd(addToList(listId, payload.ids), target.name);
                }}
              />
              <Tooltip title={`Máximo ${MAX_ITEMS_PER_LIST} instrumentos por lista`}>
                <Chip
                  size="small"
                  color={listFull ? "warning" : "default"}
                  label={`${activeList.items.length}/${MAX_ITEMS_PER_LIST}`}
                  sx={{ height: 18, fontSize: 10 }}
                />
              </Tooltip>
            </Stack>

            {/* Row 2: search & tools */}
            <Stack direction="row" sx={{ alignItems: "center", px: 1, py: 0.5, gap: 1, flexWrap: "wrap" }}>
              <Box ref={searchBoxRef}>
                <InstrumentSearch
                  instruments={instruments}
                  inList={new Set(activeList.items.map((i) => i.id))}
                  disabled={readOnly || listFull}
                  disabledReason={readOnly ? "Lista de solo lectura" : "Lista llena"}
                  onAdd={(inst) => reportAdd(addToList(activeList.id, [inst.id]), activeList.name)}
                />
              </Box>
              <TextField
                size="small"
                placeholder="Filtrar lista…"
                value={quickFilter}
                onChange={(e) => setQuickFilter(e.target.value)}
                slotProps={{ input: { sx: { fontSize: 11 } }, htmlInput: { "aria-label": "Filtrar instrumentos de la lista" } }}
                sx={{ width: 130 }}
              />
              <Box sx={{ flex: 1 }} />
              <Tooltip title="Filtrar por marca">
                <IconButton
                  size="small"
                  aria-label="Filtrar por marca"
                  color={flagFilter === "all" ? "default" : "primary"}
                  sx={{ p: 0.25 }}
                  onClick={(e) => setFlagAnchor(e.currentTarget)}
                >
                  <FlagIcon sx={{ fontSize: 16, color: flagFilter !== "all" && flagFilter !== "any" ? flagColor[flagFilter] : undefined }} />
                </IconButton>
              </Tooltip>
              {!cards && (
                <Button
                  variant="text"
                  size="small"
                  startIcon={<ViewColumnIcon sx={{ fontSize: 14 }} />}
                  onClick={(e) => setTemplatesAnchor(e.currentTarget)}
                  sx={{ fontSize: 11, minWidth: 0, px: 0.75, whiteSpace: "nowrap" }}
                >
                  Columnas
                </Button>
              )}
              <Button
                variant="text"
                size="small"
                startIcon={<FilterListIcon sx={{ fontSize: 14 }} />}
                onClick={() => apiRef.current?.showFilterPanel()}
                sx={{ fontSize: 11, minWidth: 0, px: 0.75, whiteSpace: "nowrap" }}
              >
                Filtros
              </Button>
              <Tooltip title="Importar (CSV o pegar nemotécnicos)">
                <span>
                  <IconButton size="small" aria-label="Importar instrumentos" sx={{ p: 0.25 }} disabled={readOnly} onClick={() => setImportOpen(true)}>
                    <UploadIcon sx={{ fontSize: 16 }} />
                  </IconButton>
                </span>
              </Tooltip>
              <Tooltip title="Exportar CSV">
                <IconButton size="small" aria-label="Exportar CSV" sx={{ p: 0.25 }} onClick={exportCsv}>
                  <DownloadIcon sx={{ fontSize: 16 }} />
                </IconButton>
              </Tooltip>
            </Stack>

            {/* Contextual banners: list/system/connection state (WL-34, WL-37) */}
            <Stack sx={{ px: 1, gap: 0.5, "& .MuiAlert-root": { py: 0, fontSize: 11, alignItems: "center" }, "& .MuiAlert-icon": { py: 0.5, fontSize: 16 } }}>
              {demoState === "disconnected" && (
                <Alert
                  severity="error"
                  action={<Button size="small" color="inherit" onClick={() => setDemo("normal")}>Reconectar</Button>}
                >
                  Conexión perdida con market data. Datos desactualizados desde{" "}
                  {disconnectedAt ? formatExchangeTime(disconnectedAt, "CL") : "—"}. Reintentando…
                </Alert>
              )}
              {demoState === "market-closed" && (
                <Alert severity="info">
                  Mercado cerrado. Horarios: {Object.values(exchangeByCountry).map((e) => `${e.code} ${e.hours}`).join(" · ")}. Se muestran precios de cierre.
                </Alert>
              )}
              {readOnly && !listBlocked && (
                <Alert
                  severity="info"
                  action={<Button size="small" color="inherit" onClick={() => duplicateList(activeList.id)}>Copiar a lista propia</Button>}
                >
                  Lista del sistema: solo lectura.
                </Alert>
              )}
              {listFull && !readOnly && (
                <Alert severity="warning">
                  Lista llena ({MAX_ITEMS_PER_LIST}/{MAX_ITEMS_PER_LIST}). Quita instrumentos o crea otra lista para agregar más.
                </Alert>
              )}
            </Stack>

            {/* Bulk actions over the multi-selection (WL-03) */}
            {selectedIds.length > 0 && !cards && (
              <Stack direction="row" sx={{ alignItems: "center", gap: 1, px: 1, py: 0.25, bgcolor: "action.selected" }}>
                <Typography variant="caption" sx={{ fontWeight: 700 }}>
                  {selectedIds.length} seleccionado(s)
                </Typography>
                <Button size="small" variant="text" sx={{ fontSize: 11 }} disabled={userLists.length === 0} onClick={(e) => setBulkAnchor({ el: e.currentTarget, mode: "list" })}>
                  {readOnly ? "Copiar a lista" : "Mover a lista"}
                </Button>
                {!readOnly && (
                  <>
                    <Button size="small" variant="text" sx={{ fontSize: 11 }} onClick={(e) => setBulkAnchor({ el: e.currentTarget, mode: "section" })}>
                      Mover a sección
                    </Button>
                    <Button size="small" variant="text" color="error" sx={{ fontSize: 11 }} onClick={() => removeFromList(selectedIds)}>
                      Quitar
                    </Button>
                  </>
                )}
                <Box sx={{ flex: 1 }} />
                <IconButton size="small" aria-label="Limpiar selección" sx={{ p: 0.25 }} onClick={() => setSelection(EMPTY_SELECTION)}>
                  <CloseIcon sx={{ fontSize: 14 }} />
                </IconButton>
              </Stack>
            )}

            <Box
              sx={{ flex: 1, minHeight: 0 }}
              onContextMenu={(e) => {
                const row = rowFromEvent(e.target);
                if (!row || typeof row.id !== "number") return;
                e.preventDefault();
                openContextMenu(row, e.clientX + 2, e.clientY - 6);
              }}
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={cancelLongPress}
              onPointerCancel={cancelLongPress}
            >
              <DataGridPro
                key={gridKey}
                apiRef={apiRef}
                aria-label={`Watchlist ${activeList.name}`}
                rows={rows}
                columns={columns}
                treeData={treeData}
                getTreeDataPath={(row: WatchlistRow) => (row.section ? [row.section, row.orderbook] : [row.orderbook])}
                setTreeDataPath={(path: string[], row: WatchlistRow) => ({ ...row, section: path.length > 1 ? path[0] : null })}
                groupingColDef={groupingColDef}
                defaultGroupingExpansionDepth={-1}
                rowReordering={!readOnly && !cards && !filtersActive}
                onRowOrderChange={handleRowOrderChange}
                checkboxSelection={!cards}
                disableRowSelectionOnClick={false}
                rowSelectionModel={selection}
                onRowSelectionModelChange={setSelection}
                isRowSelectable={(p) => typeof p.id === "number"}
                onRowClick={(p) => typeof p.id === "number" && publishLink(p.row as WatchlistRow)}
                onCellKeyDown={handleCellKeyDown}
                columnGroupingModel={cards ? undefined : columnGroupingModel}
                columnVisibilityModel={effectiveVisibility}
                onColumnVisibilityModelChange={handleVisibilityChange}
                onColumnOrderChange={bumpGridState}
                onColumnWidthChange={bumpGridState}
                onSortModelChange={bumpGridState}
                onPinnedColumnsChange={bumpGridState}
                onFilterModelChange={bumpGridState}
                getRowClassName={(p) =>
                  typeof p.id !== "number"
                    ? ""
                    : `watchlist-row${p.row.session === "Suspendido" ? " watchlist-row-suspended" : ""}${p.row.alert === "triggered" ? " watchlist-row-alert-triggered" : ""}`
                }
                getCellClassName={getCellClassName}
                density={cards ? "standard" : settings.density}
                rowHeight={cards ? 78 : 30}
                columnHeaderHeight={30}
                columnGroupHeaderHeight={20}
                listView={cards}
                listViewColumn={{ field: "card", renderCell: (p) => <WatchlistCard row={p.row as WatchlistRow} /> }}
                loading={listLoading || demoState === "loading"}
                initialState={initialGridState}
                slots={{ noRowsOverlay: WatchlistOverlay, noResultsOverlay: WatchlistOverlay }}
                slotProps={{ loadingOverlay: { variant: "skeleton", noRowsVariant: "skeleton" } }}
                hideFooterSelectedRowCount
                language="es"
                enableColumnMenu
                sx={{
                  ...compactDataGridSx,
                  fontSize: 11,
                  "& .MuiDataGrid-cell": { fontSize: 11, paddingLeft: "6px", paddingRight: "6px" },
                  "& .MuiDataGrid-columnHeaderTitle": { fontSize: 10 },
                  "& .MuiDataGrid-columnHeader": { paddingLeft: "6px", paddingRight: "6px" },
                  "& .MuiDataGrid-columnHeader button": { padding: "4px", fontSize: "0.75rem" },
                  "& .MuiDataGrid-row--dynamicHeight, & .MuiDataGrid-listViewCell": { p: 0 },
                }}
              />
            </Box>

            {/* In-context feedback (WL-39): stays inside the widget, never navigates away */}
            <Stack sx={{ position: "absolute", right: 8, bottom: 44, zIndex: 4, gap: 0.5, maxWidth: 420, pointerEvents: "none" }}>
              {feedback.map((f) => (
                <Alert
                  key={f.id}
                  severity={f.severity}
                  variant="filled"
                  onClose={() => setFeedback((prev) => prev.filter((x) => x.id !== f.id))}
                  sx={{ py: 0, fontSize: 11, pointerEvents: "auto", boxShadow: 3 }}
                >
                  {f.message}
                </Alert>
              ))}
            </Stack>
            <Box role="status" aria-live="polite" sx={visuallyHidden}>
              {announcement}
            </Box>
          </Box>

          {/* Context menu: right click, long press, Enter or Shift+F10 (WL-22, UI-12) */}
          <Menu
            open={Boolean(contextMenu)}
            onClose={() => setContextMenu(null)}
            anchorReference="anchorPosition"
            anchorPosition={contextMenu ? { top: contextMenu.y, left: contextMenu.x } : undefined}
            slotProps={{ list: { dense: true } }}
          >
            {ctxRow && [
              <ListSubheader key="h" sx={{ lineHeight: "28px", fontSize: 11, fontWeight: 700 }}>
                {ctxRow.orderbook}
              </ListSubheader>,
              <MenuItem key="buy" sx={menuItemSx} disabled={!ctxRow.hasPermission} onClick={() => { actions.openTicket(ctxRow, "buy"); setContextMenu(null); }}>
                Comprar
              </MenuItem>,
              <MenuItem key="sell" sx={menuItemSx} disabled={!ctxRow.hasPermission} onClick={() => { actions.openTicket(ctxRow, "sell"); setContextMenu(null); }}>
                Vender
              </MenuItem>,
              <MenuItem key="alert" sx={menuItemSx} onClick={() => { actions.openAlert(ctxRow); setContextMenu(null); }}>
                Crear alerta…
              </MenuItem>,
              <Divider key="d1" />,
              ...(["Gráfico", "Libro de órdenes", "Noticias", "Ficha"] as const).map((label) => (
                <MenuItem
                  key={label}
                  sx={menuItemSx}
                  onClick={() => {
                    publishLink(ctxRow);
                    notify("info", `${label} de ${ctxRow.orderbook} (demo)`);
                    setContextMenu(null);
                  }}
                >
                  {label}
                </MenuItem>
              )),
              <Divider key="d2" />,
              <MenuItem key="flags" sx={{ ...menuItemSx, gap: 0.5 }} disableRipple onClick={(e) => e.stopPropagation()}>
                Marca:
                {(["green", "yellow", "red", "blue", "none"] as Flag[]).map((flag) => (
                  <IconButton
                    key={flag}
                    size="small"
                    aria-label={`Marca ${flagLabel[flag]}`}
                    sx={{ p: 0.25 }}
                    onClick={() => {
                      actions.setFlag(ctxRow.id, flag);
                      setContextMenu(null);
                    }}
                  >
                    <FlagIcon sx={{ fontSize: 15, color: flagColor[flag] }} />
                  </IconButton>
                ))}
              </MenuItem>,
              ...(readOnly
                ? []
                : [
                    <MenuItem
                      key="section"
                      sx={menuItemSx}
                      onClick={() => {
                        setPrompt({
                          title: "Mover a sección",
                          label: "Nombre de la sección",
                          initial: ctxRow.section ?? "",
                          onSubmit: (name) => setSection([ctxRow.id], name),
                        });
                        setContextMenu(null);
                      }}
                    >
                      Mover a sección…
                    </MenuItem>,
                    <MenuItem key="remove" sx={{ ...menuItemSx, color: "error.main" }} onClick={() => { removeFromList([ctxRow.id]); setContextMenu(null); }}>
                      Quitar de la lista
                    </MenuItem>,
                  ]),
            ]}
          </Menu>

          {/* Bulk: move/copy to list or section */}
          <Menu anchorEl={bulkAnchor?.el} open={Boolean(bulkAnchor)} onClose={() => setBulkAnchor(null)} slotProps={{ list: { dense: true } }}>
            {bulkAnchor?.mode === "list" &&
              userLists.map((list) => (
                <MenuItem
                  key={list.id}
                  sx={menuItemSx}
                  onClick={() => {
                    const ids = selectedIds;
                    const result = addToList(list.id, ids);
                    if (!readOnly) {
                      const moved = new Set(ids);
                      updateList(activeList.id, (items) => items.filter((i) => !moved.has(i.id)));
                      setSelection(EMPTY_SELECTION);
                    }
                    reportAdd(result, list.name);
                    setBulkAnchor(null);
                  }}
                >
                  {list.name}
                </MenuItem>
              ))}
            {bulkAnchor?.mode === "section" && [
              ...sections.map((section) => (
                <MenuItem key={section} sx={menuItemSx} onClick={() => { setSection(selectedIds, section); setBulkAnchor(null); }}>
                  {section}
                </MenuItem>
              )),
              <MenuItem key="__none" sx={menuItemSx} onClick={() => { setSection(selectedIds, null); setBulkAnchor(null); }}>
                Sin sección
              </MenuItem>,
              <MenuItem
                key="__new"
                sx={menuItemSx}
                onClick={() => {
                  const ids = selectedIds;
                  setPrompt({ title: "Nueva sección", label: "Nombre de la sección", onSubmit: (name) => setSection(ids, name) });
                  setBulkAnchor(null);
                }}
              >
                Nueva sección…
              </MenuItem>,
            ]}
          </Menu>

          {/* Flag filter (WL-27) */}
          <Menu anchorEl={flagAnchor} open={Boolean(flagAnchor)} onClose={() => setFlagAnchor(null)} slotProps={{ list: { dense: true } }}>
            {(["all", "any", "green", "yellow", "red", "blue"] as const).map((value) => (
              <MenuItem key={value} sx={menuItemSx} selected={flagFilter === value} onClick={() => { setFlagFilter(value); setFlagAnchor(null); }}>
                <ListItemIcon>
                  <FlagIcon sx={{ fontSize: 15, color: value === "all" || value === "any" ? "text.secondary" : flagColor[value] }} />
                </ListItemIcon>
                <ListItemText slotProps={{ primary: { sx: { fontSize: 12 } } }}>
                  {value === "all" ? "Todos" : value === "any" ? "Con cualquier marca" : `Marca ${flagLabel[value].toLowerCase()}`}
                </ListItemText>
              </MenuItem>
            ))}
          </Menu>

          {/* Column panel + templates (WL-08, WL-11, UI-17) */}
          <Menu anchorEl={templatesAnchor} open={Boolean(templatesAnchor)} onClose={() => setTemplatesAnchor(null)} slotProps={{ list: { dense: true } }}>
            <MenuItem
              sx={menuItemSx}
              onClick={() => {
                setTemplatesAnchor(null);
                apiRef.current?.showPreferences(GridPreferencePanelsValue.columns);
              }}
            >
              Mostrar / ocultar columnas…
            </MenuItem>
            <Divider />
            <ListSubheader sx={{ lineHeight: "26px", fontSize: 11 }}>Plantillas</ListSubheader>
            {builtInTemplates.map((tpl) => (
              <MenuItem key={tpl.id} sx={menuItemSx} onClick={() => applyTemplate(tpl)}>
                {tpl.name}
              </MenuItem>
            ))}
            {templates.length > 0 && <ListSubheader sx={{ lineHeight: "26px", fontSize: 11 }}>Mis plantillas</ListSubheader>}
            {templates.map((tpl) => (
              <MenuItem key={tpl.id} sx={menuItemSx} onClick={() => applyTemplate(tpl)}>
                <ListItemText slotProps={{ primary: { sx: { fontSize: 12 } } }}>{tpl.name}</ListItemText>
                <IconButton
                  size="small"
                  edge="end"
                  aria-label={`Eliminar plantilla ${tpl.name}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    setTemplates((prev) => prev.filter((t) => t.id !== tpl.id));
                  }}
                >
                  <DeleteIcon sx={{ fontSize: 14 }} />
                </IconButton>
              </MenuItem>
            ))}
            <Divider />
            <MenuItem
              sx={menuItemSx}
              onClick={() => {
                setTemplatesAnchor(null);
                setPrompt({ title: "Guardar plantilla", label: "Nombre de la plantilla", onSubmit: saveTemplate });
              }}
            >
              Guardar vista actual como plantilla…
            </MenuItem>
            <MenuItem
              sx={menuItemSx}
              onClick={() => {
                setTemplatesAnchor(null);
                setConfirmReset(true);
              }}
            >
              Restaurar vista por defecto…
            </MenuItem>
          </Menu>

          {/* Settings */}
          <Menu anchorEl={menuAnchor} open={Boolean(menuAnchor)} onClose={() => setMenuAnchor(null)} slotProps={{ list: { dense: true }, paper: { sx: { maxHeight: 520 } } }}>
            <ListSubheader sx={{ lineHeight: "26px", fontSize: 11 }}>Vista</ListSubheader>
            {(
              [
                ["auto", "Automática (tarjetas si es angosto)"],
                ["table", "Tabla"],
                ["cards", "Tarjetas"],
              ] as const
            ).map(([value, label]) => (
              <MenuItem key={value} sx={menuItemSx} onClick={() => setSettings((s) => ({ ...s, viewMode: value }))}>
                {check(settings.viewMode === value)}
                {label}
              </MenuItem>
            ))}
            <ListSubheader sx={{ lineHeight: "26px", fontSize: 11 }}>Densidad</ListSubheader>
            {(
              [
                ["compact", "Compacta"],
                ["standard", "Estándar"],
                ["comfortable", "Cómoda"],
              ] as const
            ).map(([value, label]) => (
              <MenuItem key={value} sx={menuItemSx} onClick={() => setSettings((s) => ({ ...s, density: value }))}>
                {check(settings.density === value)}
                {label}
              </MenuItem>
            ))}
            <ListSubheader sx={{ lineHeight: "26px", fontSize: 11 }}>Flash de precio</ListSubheader>
            <MenuItem sx={{ ...menuItemSx, gap: 0.5, flexWrap: "wrap" }} disableRipple>
              {flashOptions.map((ms) => (
                <Chip
                  key={ms}
                  size="small"
                  label={ms === 0 ? "Off" : `${ms} ms`}
                  color={settings.flashMs === ms ? "primary" : "default"}
                  onClick={() => setSettings((s) => ({ ...s, flashMs: ms }))}
                  sx={{ height: 20, fontSize: 10 }}
                />
              ))}
            </MenuItem>
            <Divider />
            <MenuItem sx={menuItemSx} onClick={() => { setRulesOpen(true); setMenuAnchor(null); }}>
              Formato condicional…
            </MenuItem>
            <MenuItem sx={menuItemSx} onClick={() => { setAlertTarget("list"); setMenuAnchor(null); }}>
              Alerta de lista…{activeListAlert ? ` (±${activeListAlert.thresholdPercent}%)` : ""}
            </MenuItem>
            <MenuItem sx={menuItemSx} onClick={() => { setFormulaMode("column"); setMenuAnchor(null); }}>
              Nueva columna calculada…
            </MenuItem>
            <MenuItem sx={menuItemSx} onClick={() => { setFormulaMode("synthetic"); setMenuAnchor(null); }}>
              Nuevo instrumento sintético…
            </MenuItem>
            {calculatedColumns.map((calc) => (
              <MenuItem key={calc.field} sx={{ ...menuItemSx, pl: 4 }} onClick={(e) => e.stopPropagation()}>
                <ListItemText slotProps={{ primary: { sx: { fontSize: 12 } } }}>ƒ {calc.name}</ListItemText>
                <IconButton
                  size="small"
                  edge="end"
                  aria-label={`Eliminar columna ${calc.name}`}
                  onClick={() => setCalculatedColumns((prev) => prev.filter((c) => c.field !== calc.field))}
                >
                  <DeleteIcon sx={{ fontSize: 14 }} />
                </IconButton>
              </MenuItem>
            ))}
            <Divider />
            <ListSubheader sx={{ lineHeight: "26px", fontSize: 11 }}>Simular estado (demo)</ListSubheader>
            {(Object.keys(demoStateLabel) as DemoState[]).map((state) => (
              <MenuItem key={state} sx={menuItemSx} onClick={() => setDemo(state)}>
                {check(demoState === state)}
                {demoStateLabel[state]}
              </MenuItem>
            ))}
          </Menu>

          {ticket && (
            <OrderTicketDialog ticket={ticket} onClose={() => setTicket(null)} onResult={(r) => notify(r.severity, r.message)} />
          )}
          {alertTarget && (
          <AlertDialog
            target={alertTarget}
            existing={existingAlert}
            listAlertThreshold={activeListAlert?.thresholdPercent ?? null}
            listName={activeList.name}
            onSave={(op, price) => {
              if (!alertTarget || alertTarget === "list") return;
              const id = alertTarget.id;
              setPriceAlerts((prev) => [...prev.filter((a) => a.instrumentId !== id), { instrumentId: id, op, price, status: "active" }]);
              notify("success", `Alerta creada: ${alertTarget.orderbook} ${op} ${price}`);
            }}
            onDelete={() => {
              if (!alertTarget || alertTarget === "list") return;
              setPriceAlerts((prev) => prev.filter((a) => a.instrumentId !== alertTarget.id));
            }}
            onSaveListAlert={(threshold) => {
              setListAlerts((prev) => [
                ...prev.filter((a) => a.listId !== activeList.id),
                ...(threshold == null ? [] : [{ listId: activeList.id, thresholdPercent: threshold, fired: [] }]),
              ]);
              notify("success", threshold == null ? "Alerta de lista eliminada" : `Alerta de lista: ±${threshold}%`);
            }}
            onClose={() => setAlertTarget(null)}
          />
          )}
          <RulesDrawer open={rulesOpen} rules={rules} onChange={setRules} onClose={() => setRulesOpen(false)} />
          {formulaMode && (
            <FormulaDialog
              mode={formulaMode}
              sample={rows[0] ?? null}
              resolve={resolve}
              onSubmit={formulaMode === "synthetic" ? createSynthetic : createCalculatedColumn}
              onClose={() => setFormulaMode(null)}
            />
          )}
          {importOpen && <ImportDialog onImport={importTickers} onClose={() => setImportOpen(false)} />}
          {prompt && (
            <PromptDialog
              open
              title={prompt.title}
              label={prompt.label}
              initialValue={prompt.initial}
              onSubmit={prompt.onSubmit}
              onClose={() => setPrompt(null)}
            />
          )}
          <ConfirmDialog
            open={confirmReset}
            title="Restaurar vista por defecto"
            message="Se restablecen columnas, orden, anchos, filtros, densidad, vista y formato condicional. Tus listas, marcas y alertas se conservan."
            confirmLabel="Restaurar"
            onConfirm={resetView}
            onClose={() => setConfirmReset(false)}
          />
        </OverlayContext.Provider>
      </WatchlistContext.Provider>
    </PanelWindow>
  );
}
