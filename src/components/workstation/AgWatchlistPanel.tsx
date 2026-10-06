"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Box, useColorScheme } from "@mui/material";
import { AgGridReact, type CustomCellRendererProps } from "ag-grid-react";
import {
  colorSchemeDark,
  colorSchemeLight,
  themeQuartz,
  type CellClassParams,
  type CellClickedEvent,
  type CellKeyDownEvent,
  type ColDef,
  type ColGroupDef,
  type ColumnVisibleEvent,
  type DefaultMenuItem,
  type GetContextMenuItemsParams,
  type GridApi,
  type GridState,
  type MenuItemDef,
  type Module,
  type RowClassParams,
  type RowDragEndEvent,
  type ValueFormatterParams,
} from "ag-grid-community";
import { exchangeByCountry, type ConditionalRule, type Flag, type ListItem, type WatchlistRow } from "@/lib/watchlist/model";
import { formatExchangeTime, formatInt, formatNumber, formatPercent, formatSigned } from "@/lib/watchlist/format";
import type { PanelWindowControls } from "./panels/PanelWindow";
import { DEFAULT_TEMPLATE_ID, GROUP_LABELS, RowActions, builtInTemplates } from "./watchlist/columns";
import { AlertIndicator, EventIcons, FlagButton, MaskedValue, QualityBadge, SessionBadge, flagLabel } from "./watchlist/cells";
import { INSTRUMENT_DRAG_MIME, type InstrumentDragPayloadV1 } from "./watchlist/ListTabs";
import { WatchlistOverlay } from "./watchlist/overlays";
import { WatchlistCard } from "./watchlist/WatchlistCard";
import { WatchlistShell } from "./watchlist/WatchlistShell";
import { matchesRule, useWatchlistController, type GridAdapter } from "./watchlist/useWatchlistController";

export type AgEdition = "enterprise" | "community";

interface AgWatchlistPanelProps extends PanelWindowControls {
  dragHandleClassName?: string;
  edition: AgEdition;
  /** Modules for this grid instance only (see lib/agGridEnterprise.ts / lib/agGridCommunity.ts). */
  modules: Module[];
}

/**
 * Community uses only what AG Grid Community ships: no row grouping, context menu, side bar,
 * set filter, sparklines, calculated columns or clipboard. The shared chrome (lists, search,
 * dialogs, ticket) is not part of the grid and stays the same in both editions.
 */
const EDITION: Record<AgEdition, { storageKey: string; benchId: "ag" | "ag-community"; title: string; gridLabel: string }> = {
  enterprise: { storageKey: "nuam.tws.watchlist-ag", benchId: "ag", title: "Watchlist (AG Grid Enterprise)", gridLabel: "Watchlist AG Grid" },
  community: {
    storageKey: "nuam.tws.watchlist-ag-community",
    benchId: "ag-community",
    title: "Watchlist (AG Grid Community)",
    gridLabel: "Watchlist AG Grid Community",
  },
};
const defaultVisibility = builtInTemplates.find((t) => t.id === DEFAULT_TEMPLATE_ID)!.visibility;
const rowHeightByDensity = { compact: 21, standard: 30, comfortable: 39 } as const;
/** Layout keys persisted by this widget; visibility is owned by the shared controller. */
const LAYOUT_KEYS = ["columnOrder", "columnPinning", "columnSizing", "sort", "filter", "userColumns"] as const satisfies (keyof GridState)[];
const NOT_EXPORTED = new Set(["flag", "alert", "events", "intraday", "actions", "dragOut"]);
const DRAG_OUT_ICON =
  "url(\"data:image/svg+xml;charset=utf-8,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Cpath d='M9 5v2h6.59L4 18.59 5.41 20 17 8.41V15h2V5z'/%3E%3C/svg%3E\")";
const sparkStroke = { light: { up: "#0A7A52", down: "#C62828" }, dark: { up: "#5FE0B4", down: "#FF8A80" } };

type R = CustomCellRendererProps<WatchlistRow>;
/** Adapts a shared `{ row }` cell component to an AG Grid cell renderer (skips group rows). */
function rowRenderer(Component: (props: { row: WatchlistRow }) => ReactNode) {
  return function Renderer(props: R) {
    return props.data ? <Component row={props.data} /> : null;
  };
}
const FlagRenderer = rowRenderer(FlagButton);
const AlertRenderer = rowRenderer(AlertIndicator);
const EventsRenderer = rowRenderer(EventIcons);
const SessionRenderer = rowRenderer(SessionBadge);
const QualityRenderer = rowRenderer(QualityBadge);
const MaskedRenderer = rowRenderer(MaskedValue);
const ActionsRenderer = rowRenderer(RowActions);
function CardRenderer(props: R) {
  return props.data ? <WatchlistCard row={props.data} /> : null;
}

const price = (p: ValueFormatterParams<WatchlistRow, number | null>) =>
  p.data ? formatNumber(p.value, p.data.country, p.data.decimals) : "";
const integer = (p: ValueFormatterParams<WatchlistRow, number | null>) => (p.data ? formatInt(p.value, p.data.country) : "");
const signedArrow = (value: number | null | undefined, text: string) =>
  value == null ? "—" : value > 0 ? `▲ ${text}` : value < 0 ? `▼ ${text}` : text;
const directionClass = {
  "wl-pos": (p: CellClassParams<WatchlistRow>) => (p.value ?? 0) > 0,
  "wl-neg": (p: CellClassParams<WatchlistRow>) => (p.value ?? 0) < 0,
};
/** Colors the native change flash by tick direction (AG Grid flashes with a single color). */
const tickClass = {
  "wl-tick-up": (p: CellClassParams<WatchlistRow>) => (p.data?.lastTick ?? 0) > 0,
  "wl-tick-down": (p: CellClassParams<WatchlistRow>) => (p.data?.lastTick ?? 0) < 0,
};
/** Masked renderer for instruments without data entitlement (WL-37). */
const maskedSelector = (p: { data?: WatchlistRow }) => (p.data && !p.data.hasPermission ? { component: MaskedRenderer } : undefined);

interface BuildOptions {
  rules: ConditionalRule[];
  flash: boolean;
  dark: boolean;
  enterprise: boolean;
  dragOutPayload: (row: WatchlistRow) => InstrumentDragPayloadV1;
  /** Whether the reorder handle is active (Community has no auto group column to carry it). */
  rowDragEnabled: boolean;
}

function buildColumnDefs({ rules, flash, dark, enterprise, dragOutPayload, rowDragEnabled }: BuildOptions): (ColDef<WatchlistRow> | ColGroupDef<WatchlistRow>)[] {
  // The set filter is Enterprise; Community falls back to its native text filter.
  const listFilter = enterprise ? "agSetColumnFilter" : "agTextColumnFilter";
  // Conditional formatting rules (UI-09) become native cellClassRules per field.
  const ruleClasses = (field: string) =>
    Object.fromEntries(
      (["up", "down", "warn", "info"] as const).map((style) => [
        `wl-cf-${style}`,
        (p: CellClassParams<WatchlistRow>) =>
          Boolean(p.data?.hasPermission) &&
          rules.find((r) => r.field === field && matchesRule(p.data?.[field as keyof WatchlistRow], r))?.style === style,
      ]),
    );
  const numeric = (field: keyof WatchlistRow & string, headerName: string, width: number, extra: ColDef<WatchlistRow> = {}): ColDef<WatchlistRow> => ({
    field,
    headerName,
    width,
    type: "rightAligned",
    filter: "agNumberColumnFilter",
    valueFormatter: price,
    cellRendererSelector: maskedSelector,
    cellClassRules: ruleClasses(field),
    ...extra,
  });
  const stroke = dark ? sparkStroke.dark : sparkStroke.light;

  return [
    {
      colId: "dragOut",
      headerName: "",
      width: 30,
      pinned: "left",
      lockPinned: true,
      suppressHeaderMenuButton: true,
      sortable: false,
      // Native HTML5 drag source: drop on another list tab or any widget reading the contract (WL-25).
      dndSource: true,
      dndSourceOnRowDrag: ({ rowNode, dragEvent }) => {
        if (!rowNode.data || !dragEvent.dataTransfer) return;
        const payload = dragOutPayload(rowNode.data);
        dragEvent.dataTransfer.setData(INSTRUMENT_DRAG_MIME, JSON.stringify(payload));
        dragEvent.dataTransfer.setData("text/plain", payload.orderbooks.join("\n"));
        dragEvent.dataTransfer.effectAllowed = "copyMove";
      },
      headerTooltip: "Arrastrar a otra lista o widget",
    },
    { field: "flag", headerName: "Marca", headerComponentParams: { displayName: "" }, width: 40, pinned: "left", cellRenderer: FlagRenderer, sortable: false, filter: listFilter },
    // Enterprise groups by section (WL-04). Community has no row grouping: the list stays flat.
    enterprise ? { field: "section", headerName: "Sección", rowGroup: true, hide: true, enableRowGroup: true } : { field: "section", headerName: "Sección", hide: true },
    ...(enterprise
      ? []
      : [
          {
            field: "orderbook",
            headerName: "Nemotécnico",
            pinned: "left",
            width: 150,
            cellClass: "wl-strong",
            filter: "agTextColumnFilter",
            rowDrag: () => rowDragEnabled,
          } satisfies ColDef<WatchlistRow>,
        ]),
    {
      headerName: GROUP_LABELS.instrument,
      groupId: "instrument",
      children: [
        { field: "alert", headerName: "Alerta", width: 56, cellRenderer: AlertRenderer, sortable: false },
        { field: "events", headerName: "Eventos", width: 70, cellRenderer: EventsRenderer, sortable: false, filter: false, cellDataType: false },
        { field: "description", headerName: "Descripción", flex: 1, minWidth: 200, filter: "agTextColumnFilter", tooltipField: "description" },
        { field: "assetClass", headerName: "Clase", width: 70, filter: listFilter },
        {
          field: "status",
          headerName: "Estado",
          width: 92,
          valueFormatter: (p) => (p.value === "ENABLED" ? "Habilitado" : p.value ? "Deshab." : ""),
          cellClassRules: { "wl-pos": (p) => p.value === "ENABLED" },
          filter: listFilter,
        },
        { field: "session", headerName: "Sesión", width: 108, cellRenderer: SessionRenderer, filter: listFilter },
        { field: "quality", headerName: "Dato", width: 82, cellRenderer: QualityRenderer, headerTooltip: "Calidad del dato: tiempo real, diferido o desactualizado", filter: listFilter },
        { field: "currency", headerName: "Moneda", width: 72, filter: listFilter },
        { field: "settlement", headerName: "Liquidación", width: 90 },
      ],
    },
    {
      headerName: GROUP_LABELS["trade-info"],
      groupId: "trade-info",
      children: [
        // Native animate-change renderer: value plus a temporary ▲/▼ delta (WL-15).
        numeric("last", "Último", 104, {
          enableCellChangeFlash: flash,
          cellRendererSelector: (p) => maskedSelector(p) ?? { component: "agAnimateShowChangeCellRenderer" },
          cellClassRules: { ...ruleClasses("last"), ...tickClass, "wl-strong": () => true },
        }),
        numeric("netChange", "Var.", 88, {
          valueFormatter: (p) => (p.data ? signedArrow(p.value, formatSigned(p.value, p.data.country, p.data.decimals)) : ""),
          cellClassRules: { ...ruleClasses("netChange"), ...directionClass },
        }),
        numeric("changePercent", "Var. %", 96, {
          enableCellChangeFlash: flash,
          valueFormatter: (p) => (p.data ? signedArrow(p.value, formatPercent(p.value, p.data.country)) : ""),
          cellClassRules: { ...ruleClasses("changePercent"), ...directionClass, ...tickClass },
        }),
        // Native Enterprise sparkline (UI-25); Community has no sparkline, so the column is omitted.
        ...(enterprise
          ? [
              {
                field: "intraday",
                headerName: "Intradía",
                width: 90,
                sortable: false,
                filter: false,
                cellDataType: false,
                // Color by intraday direction.
                cellRendererSelector: (p) => {
                  const data = p.data;
                  if (!data || !data.hasPermission || data.intraday.length < 2) return undefined;
                  const up = data.intraday[data.intraday.length - 1] >= data.intraday[0];
                  return {
                    component: "agSparklineCellRenderer",
                    params: { sparklineOptions: { type: "line", stroke: up ? stroke.up : stroke.down, strokeWidth: 1.5, padding: { top: 3, bottom: 3, left: 2, right: 2 } } },
                  };
                },
              } satisfies ColDef<WatchlistRow>,
            ]
          : []),
        numeric("open", "Apertura", 92),
        numeric("high", "Máximo", 92),
        numeric("low", "Mínimo", 92),
        numeric("previousClose", "Cierre ant.", 92),
        {
          field: "lastTradeAt",
          headerName: "Hora",
          width: 86,
          headerTooltip: "Hora del último trade en la zona horaria de cada bolsa",
          valueFormatter: (p) => (p.data ? formatExchangeTime(p.value, p.data.country) : ""),
          tooltipValueGetter: (p) => (p.data ? exchangeByCountry[p.data.country].timeZone : undefined),
        },
      ],
    },
    {
      headerName: GROUP_LABELS.market,
      groupId: "market",
      children: [
        numeric("bidQty", "Cant. compra", 98, { valueFormatter: integer, cellClass: "wl-muted" }),
        // Bid/Ask cells open the prefilled ticket on click: Ask buys, Bid sells (WL-20).
        numeric("bidPrice", "Compra", 92, { enableCellChangeFlash: flash, cellClass: "wl-quote wl-quote-bid", cellClassRules: tickClass, tooltipValueGetter: () => "Clic: vender a este precio" }),
        numeric("askPrice", "Venta", 92, { enableCellChangeFlash: flash, cellClass: "wl-quote wl-quote-ask", cellClassRules: tickClass, tooltipValueGetter: () => "Clic: comprar a este precio" }),
        numeric("askQty", "Cant. venta", 98, { valueFormatter: integer, cellClass: "wl-muted" }),
        numeric("spread", "Spread", 80),
      ],
    },
    {
      headerName: GROUP_LABELS.other,
      groupId: "other",
      children: [
        numeric("volume", "Volumen", 104, { valueFormatter: integer, cellClass: "wl-muted" }),
        numeric("amount", "Monto", 124, { valueFormatter: integer, cellClass: "wl-muted" }),
        numeric("referencePrice", "Precio ref.", 92),
      ],
    },
    {
      headerName: GROUP_LABELS.position,
      groupId: "position",
      children: [
        {
          colId: "positionQty",
          headerName: "Posición",
          width: 88,
          type: "rightAligned",
          valueGetter: (p) => p.data?.position?.qty ?? null,
          valueFormatter: integer,
        },
        {
          colId: "pnl",
          headerName: "P&L",
          width: 108,
          type: "rightAligned",
          headerTooltip: "Resultado no realizado en tiempo real: (último − precio medio) × cantidad",
          valueGetter: (p) => (p.data?.position && p.data.last != null ? (p.data.last - p.data.position.avgPrice) * p.data.position.qty : null),
          valueFormatter: (p) => (p.data && p.value != null ? signedArrow(p.value, formatSigned(p.value, p.data.country, 0)) : ""),
          enableCellChangeFlash: flash,
          cellClassRules: directionClass,
        },
      ],
    },
    { colId: "actions", headerName: "Operar", width: 120, cellRenderer: ActionsRenderer, sortable: false, filter: false, suppressHeaderMenuButton: true },
  ];
}

/** Watchlist on AG Grid (Enterprise or Community). Same control plane and chrome as the MUI X watchlists. */
export function AgWatchlistPanel({ dragHandleClassName, edition, modules, ...controls }: AgWatchlistPanelProps) {
  const config = EDITION[edition];
  const enterprise = edition === "enterprise";
  const adapterRef = useRef<GridAdapter | null>(null);
  const apiRef = useRef<GridApi<WatchlistRow> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const wl = useWatchlistController({ storageKey: config.storageKey, defaultVisibility, adapterRef, benchId: config.benchId });
  const { rows, cards, readOnly, filtersActive, settings, actions, effectiveVisibility, layoutChanged, instruments } = wl;
  const { mode, systemMode } = useColorScheme();
  const dark = (mode === "system" ? systemMode : mode) === "dark";
  const [gridKey, setGridKey] = useState(0);
  const [sorted, setSorted] = useState(false);
  // Community has no filters tool panel; "Filtros" shows its native floating filters instead.
  const [floatingFilters, setFloatingFilters] = useState(false);
  const rowDragEnabled = !readOnly && !filtersActive && !sorted;

  const live = useCallback(() => {
    const api = apiRef.current;
    return api && !api.isDestroyed() ? api : null;
  }, []);

  // ---- Grid adapter: how the shared watchlist talks to AG Grid.
  const adapter = useMemo<GridAdapter>(
    () => ({
      push: (updates) => {
        const api = live();
        if (!api) return;
        // Merge into the row (section/flag/alert live on the row, not on the instrument) and use
        // the async, batched transaction path built for high-frequency updates (UI-02).
        const update = updates.flatMap((u) => {
          const node = api.getRowNode(String(u.id));
          return node?.data ? [{ ...node.data, ...u }] : [];
        });
        if (update.length > 0) api.applyTransactionAsync({ update });
      },
      captureLayout: () => {
        const state = live()?.getState();
        if (!state) return undefined;
        return Object.fromEntries(LAYOUT_KEYS.filter((k) => state[k] !== undefined).map((k) => [k, state[k]])) as GridState;
      },
      applyLayout: (layout) => live()?.setState(layout as GridState, ["columnVisibility", "rowSelection", "scroll", "focusedCell"]),
      resetLayout: () => setGridKey((k) => k + 1),
      clearGridFilters: () => live()?.setFilterModel(null),
      exportCsv: (fileName) => {
        const api = live();
        if (!api) return;
        const columnKeys = (api.getAllDisplayedColumns() ?? []).map((c) => c.getColId()).filter((id) => !NOT_EXPORTED.has(id));
        api.exportDataAsCsv({ fileName: `${fileName}.csv`, columnSeparator: ";", columnKeys });
      },
      openFilters: () => {
        const api = live();
        if (!enterprise) {
          setFloatingFilters((v) => !v);
          return;
        }
        api?.setSideBarVisible(true);
        api?.openToolPanel("filters");
      },
      openColumnsPanel: () => {
        if (!enterprise) {
          wl.notify("info", "AG Grid Community no incluye panel de columnas; usa las plantillas o el menú de cada columna");
          return;
        }
        const api = live();
        api?.setSideBarVisible(true);
        api?.openToolPanel("columns");
      },
      createCalculatedColumn: () => {
        if (!enterprise) {
          wl.notify("info", "Las columnas calculadas son una función de AG Grid Enterprise");
          return;
        }
        // AG Grid's native calculated-column editor (UI-21) lives in the column menu.
        live()?.showColumnMenu("last");
        wl.notify("info", "Elige \"Columna calculada\" en el menú de la columna");
      },
    }),
    [live, wl, enterprise],
  );
  useEffect(() => {
    adapterRef.current = adapter;
  }, [adapter]);

  // ---- Shared column visibility (templates + responsive hiding) applied to AG Grid.
  const applyVisibility = useCallback(() => {
    const api = live();
    if (!api) return;
    const show: string[] = [];
    const hide: string[] = [];
    for (const column of api.getColumns() ?? []) {
      const id = column.getColId();
      if (id === "section" || id === "dragOut" || id.startsWith("ag-Grid")) continue;
      (effectiveVisibility[id] === false ? hide : show).push(id);
    }
    api.setColumnsVisible(show, true);
    api.setColumnsVisible(hide, false);
  }, [live, effectiveVisibility]);
  useEffect(applyVisibility, [applyVisibility]);

  const onColumnVisible = (e: ColumnVisibleEvent<WatchlistRow>) => {
    if (e.source === "api") return;
    const model: Record<string, boolean> = {};
    for (const column of e.api.getColumns() ?? []) {
      const id = column.getColId();
      if (id === "section" || id === "dragOut" || id.startsWith("ag-Grid")) continue;
      if (!column.isVisible()) model[id] = false;
    }
    wl.updateColumnVisibility(model);
  };

  // ---- Selection sync: the controller can clear it (remove, move, switch list).
  useEffect(() => {
    const api = live();
    if (api && wl.selectedIds.length === 0 && api.getSelectedNodes().length > 0) api.deselectAll();
  }, [live, wl.selectedIds]);

  const dragOutPayload = useCallback(
    (row: WatchlistRow): InstrumentDragPayloadV1 => {
      const ids = actions.dragIdsFor(row.id);
      const orderbooks = ids.map((id) => instruments.get(id)?.orderbook ?? "");
      return { version: 1, ids, orderbooks, sourceListId: actions.activeListId };
    },
    [actions, instruments],
  );

  const columnDefs = useMemo(
    () =>
      cards
        ? // Cards are full-width rows; a single flexible column keeps them as wide as the widget.
          [{ field: "orderbook" as const, flex: 1 }]
        : buildColumnDefs({ rules: wl.rules, flash: settings.flashMs > 0, dark, enterprise, dragOutPayload, rowDragEnabled }),
    [wl.rules, settings.flashMs, dark, cards, enterprise, dragOutPayload, rowDragEnabled],
  );

  const theme = useMemo(
    () =>
      themeQuartz.withPart(dark ? colorSchemeDark : colorSchemeLight).withParams({
        accentColor: dark ? "#FF623D" : "#FF4201",
        fontSize: 11,
        headerFontSize: 10,
        headerFontWeight: 700,
        spacing: 4,
        wrapperBorder: false,
        wrapperBorderRadius: 0,
        cellHorizontalPadding: 6,
        valueChangeValueHighlightBackgroundColor: dark ? "rgba(255,255,255,0.18)" : "rgba(0,0,0,0.10)",
        ...(dark ? { backgroundColor: "#121212" } : {}),
      }),
    [dark],
  );

  // ---- Row drag (WL-03): managed drag reorders; we read the order back into the list model.
  const onRowDragEnd = (e: RowDragEndEvent<WatchlistRow>) => {
    const movedIds = new Set(e.nodes.filter((n) => n.data).map((n) => n.data!.id));
    const over = e.overNode;
    // Only grouped (Enterprise) rows can change section by dragging; Community just reorders.
    const targetSection = enterprise && over ? (over.group ? (over.key ?? null) : (over.data?.section ?? null)) : undefined;
    const ordered: ListItem[] = [];
    e.api.forEachNode((node) => {
      if (!node.data) return;
      ordered.push({ id: node.data.id, section: movedIds.has(node.data.id) && targetSection !== undefined ? targetSection : node.data.section });
    });
    wl.reorderActiveList(ordered);
  };

  // ---- Native context menu (WL-22, UI-12); long press on touch is handled by AG Grid.
  const getContextMenuItems = (params: GetContextMenuItemsParams<WatchlistRow>): (DefaultMenuItem | MenuItemDef<WatchlistRow>)[] => {
    const node = params.node;
    if (node?.group) {
      const section = String(node.key ?? "");
      return [
        ...(readOnly ? [] : [{ name: `Renombrar sección "${section}"…`, action: () => actions.renameSection(section) }]),
        "expandAll",
        "contractAll",
      ];
    }
    const row = node?.data;
    if (!row) return ["copy", "csvExport"];
    const flags: Flag[] = ["green", "yellow", "red", "blue", "none"];
    return [
      { name: "Comprar", disabled: !row.hasPermission, action: () => actions.openTicket(row, "buy") },
      { name: "Vender", disabled: !row.hasPermission, action: () => actions.openTicket(row, "sell") },
      { name: "Crear alerta…", action: () => actions.openAlert(row) },
      "separator",
      ...(["Gráfico", "Libro de órdenes", "Noticias", "Ficha"] as const).map((label) => ({
        name: label,
        action: () => {
          wl.publishLink(row);
          wl.notify("info", `${label} de ${row.orderbook} (demo)`);
        },
      })),
      "separator",
      { name: "Marca", subMenu: flags.map((flag) => ({ name: flagLabel[flag], checked: row.flag === flag, action: () => actions.setFlag(row.id, flag) })) },
      ...(readOnly
        ? []
        : [
            {
              name: "Mover a sección…",
              action: () =>
                wl.setPrompt({ title: "Mover a sección", label: "Nombre de la sección", initial: row.section ?? "", onSubmit: (name) => wl.setSection([row.id], name) }),
            },
            { name: "Quitar de la lista", cssClasses: ["wl-menu-danger"], action: () => wl.removeFromList([row.id]) },
          ]),
      "separator",
      "copy",
      "copyWithHeaders",
      "csvExport",
    ];
  };

  // ---- Keyboard shortcuts (WL-24); arrows, Space selection and Ctrl+C are native.
  const onCellKeyDown = (e: CellKeyDownEvent<WatchlistRow>) => {
    const event = e.event as KeyboardEvent | null | undefined;
    const row = e.data;
    if (!event || !row || e.node.group || event.ctrlKey || event.metaKey || event.altKey) return;
    // The context menu is Enterprise; in Community, Enter / Shift+F10 have no menu to open.
    const openMenu = () => {
      if (enterprise) e.api.showContextMenu({ rowNode: e.node, column: e.column, value: e.value, source: "api" });
    };
    const key = event.shiftKey && event.key === "F10" ? "contextmenu" : event.key;
    if (wl.handleShortcut(row, key, openMenu)) event.preventDefault();
  };

  const onCellClicked = (e: CellClickedEvent<WatchlistRow>) => {
    const row = e.data;
    if (!row || !row.hasPermission) return;
    const colId = e.column.getColId();
    if (colId === "bidPrice" && row.bidPrice != null) actions.openTicket(row, "sell");
    if (colId === "askPrice" && row.askPrice != null) actions.openTicket(row, "buy");
  };

  // AG Grid has no aria-label prop; label the grid element itself (WL-40).
  useEffect(() => {
    containerRef.current?.querySelector('[role="treegrid"], [role="grid"]')?.setAttribute("aria-label", `${config.gridLabel} ${wl.activeList.name}`);
  });

  // Enterprise-only grid options are passed only to the Enterprise grid: AG Grid warns about
  // options whose module is not registered on that instance.
  const enterpriseProps = enterprise
    ? {
        // Grouping by section (WL-04); unsectioned instruments stay at the root.
        groupDisplayType: "singleColumn" as const,
        groupAllowUnbalanced: true,
        groupDefaultExpanded: -1,
        refreshAfterGroupEdit: true,
        autoGroupColumnDef: {
          headerName: "Nemotécnico",
          field: "orderbook" as const,
          pinned: "left" as const,
          width: 170,
          rowDrag: (p: { node: { group?: boolean } }) => rowDragEnabled && !p.node.group,
          cellRendererParams: { suppressCount: false },
        },
        getContextMenuItems,
        sideBar: { toolPanels: ["columns", "filters"], hiddenByDefault: true },
        calculatedColumns: true,
        onCalculatedColumnCreated: layoutChanged,
        onCalculatedColumnRemoved: layoutChanged,
        onCalculatedColumnExpressionChanged: layoutChanged,
      }
    : {};

  return (
    <WatchlistShell wl={wl} title={config.title} dragHandleClassName={dragHandleClassName} rootClassName="wl-ag" {...controls}>
      <Box
        ref={containerRef}
        sx={{
          flex: 1,
          minHeight: 0,
          // Native flash colored by tick direction; Bid/Ask look clickable.
          "& .ag-cell.wl-tick-up": { "--ag-value-change-value-highlight-background-color": "var(--wl-up-bg)" },
          "& .ag-cell.wl-tick-down": { "--ag-value-change-value-highlight-background-color": "var(--wl-down-bg)" },
          "& .ag-cell.wl-pos": { color: "var(--wl-up)", fontWeight: 600 },
          "& .ag-cell.wl-neg": { color: "var(--wl-down)", fontWeight: 600 },
          "& .ag-cell.wl-strong": { fontWeight: 700 },
          "& .ag-cell.wl-muted": { color: "text.secondary" },
          "& .ag-cell.wl-quote": { cursor: "pointer", fontWeight: 600 },
          "& .ag-cell.wl-quote:hover": { textDecoration: "underline" },
          "& .ag-cell.wl-quote-bid": { color: "var(--wl-up)" },
          "& .ag-cell.wl-quote-ask": { color: "var(--wl-down)" },
          "& .ag-full-width-row .ag-cell-wrapper, & .ag-full-width-row": { height: "100%" },
          // The drag-out handle (to other lists/widgets) must not look like the reorder grip.
          '& .ag-cell[col-id="dragOut"] .ag-icon::before': { maskImage: DRAG_OUT_ICON, WebkitMaskImage: DRAG_OUT_ICON },
        }}
      >
        <AgGridReact<WatchlistRow>
          key={`${gridKey}-${cards ? "cards" : "table"}`}
          modules={modules}
          theme={theme}
          rowData={rows}
          columnDefs={columnDefs}
          // Enterprise filters live in the side bar; Community uses the native header filter button
          // and, from "Filtros", its floating filters.
          defaultColDef={{
            resizable: true,
            sortable: true,
            filter: true,
            suppressHeaderFilterButton: enterprise,
            floatingFilter: !enterprise && floatingFilters,
            enableCellChangeFlash: false,
          }}
          getRowId={(p) => String(p.data.id)}
          initialState={wl.initialLayout as GridState | undefined}
          onGridReady={(e) => {
            apiRef.current = e.api;
            applyVisibility();
          }}
          onGridPreDestroyed={() => {
            apiRef.current = null;
          }}
          {...enterpriseProps}
          rowDragManaged
          rowDragMultiRow
          suppressMoveWhenRowDragging
          onRowDragEnd={onRowDragEnd}
          rowSelection={{
            mode: "multiRow",
            checkboxes: (p) => !p.node.group,
            headerCheckbox: true,
            enableClickSelection: true,
            isRowSelectable: (node) => !node.group,
          }}
          onSelectionChanged={(e) => wl.setSelectedIds(e.api.getSelectedRows().map((r) => r.id))}
          onRowClicked={(e) => e.data && wl.publishLink(e.data)}
          onCellClicked={onCellClicked}
          onCellKeyDown={onCellKeyDown}
          getRowClass={(p: RowClassParams<WatchlistRow>) =>
            p.data
              ? ["watchlist-row", p.data.session === "Suspendido" ? "watchlist-row-suspended" : "", p.data.alert === "triggered" ? "watchlist-row-alert-triggered" : ""]
              : undefined
          }
          cellFlashDuration={settings.flashMs}
          cellFadeDuration={settings.flashMs}
          asyncTransactionWaitMillis={100}
          rowHeight={cards ? 78 : rowHeightByDensity[settings.density]}
          headerHeight={cards ? 0 : 26}
          groupHeaderHeight={cards ? 0 : 20}
          isFullWidthRow={() => cards}
          fullWidthCellRenderer={CardRenderer}
          loading={wl.listLoading || wl.demoState === "loading"}
          noRowsOverlayComponent={WatchlistOverlay}
          tooltipShowDelay={400}
          animateRows={false}
          onSortChanged={(e) => {
            setSorted((e.api.getColumnState() ?? []).some((c) => c.sort));
            layoutChanged();
          }}
          onColumnVisible={onColumnVisible}
          onColumnMoved={(e) => e.finished && layoutChanged()}
          onColumnResized={(e) => e.finished && layoutChanged()}
          onColumnPinned={layoutChanged}
          onFilterChanged={layoutChanged}
        />
      </Box>
    </WatchlistShell>
  );
}
