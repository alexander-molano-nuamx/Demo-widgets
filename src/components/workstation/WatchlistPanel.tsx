"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type ComponentType, type PointerEvent as ReactPointerEvent } from "react";
import { Box, IconButton, ListItemText, MenuItem } from "@mui/material";
import DeleteIcon from "@mui/icons-material/DeleteOutlined";
import {
  GRID_ROOT_GROUP_ID,
  GridPreferencePanelsValue,
  gridRowTreeSelector,
  useGridApiRef,
  type DataGridProProps,
  type GridCellParams,
  type GridColDef,
  type GridColumnGroupingModel,
  type GridEventListener,
  type GridInitialState,
  type GridRowId,
  type GridRowSelectionModel,
  type GridTreeNode,
} from "@mui/x-data-grid-pro";
import type { ConditionalRule, ListItem, WatchlistRow } from "@/lib/watchlist/model";
import { compactDataGridSx } from "./dataGridStyles";
import type { PanelWindowControls } from "./panels/PanelWindow";
import {
  DEFAULT_TEMPLATE_ID,
  GROUP_LABELS,
  GroupHeader,
  buildColumns,
  buildGroupFields,
  builtInTemplates,
  groupingColDef,
  pinnedLeft,
} from "./watchlist/columns";
import { FormulaDialog } from "./watchlist/dialogs";
import { WatchlistOverlay } from "./watchlist/overlays";
import { WatchlistCard } from "./watchlist/WatchlistCard";
import { WatchlistShell } from "./watchlist/WatchlistShell";
import { matchesRule, useWatchlistController, type GridAdapter } from "./watchlist/useWatchlistController";

export type MuiEdition = "pro" | "premium";

/** Props the core hands to the edition's grid: Pro props plus the Premium-only ones it uses. */
export type WatchlistGridProps = DataGridProProps & { rowGroupingModel?: string[]; cellSelection?: boolean };

interface WatchlistPanelProps extends PanelWindowControls {
  dragHandleClassName?: string;
  edition: MuiEdition;
  /** Edition grid (nuam DataGridPro or DataGridPremium). Injected so each edition is its own chunk. */
  Grid: ComponentType<WatchlistGridProps>;
}

/** Field of Premium's single row-grouping column (GRID_ROW_GROUPING_SINGLE_GROUPING_FIELD). */
const ROW_GROUPING_FIELD = "__row_group_by_columns_group__";
const NO_SECTION = "Sin sección";

const EDITION = {
  pro: { storageKey: "nuam.tws.watchlist", benchId: "mui", title: "Watchlist (MUI X Pro)", pinned: pinnedLeft },
  premium: {
    storageKey: "nuam.tws.watchlist-premium",
    benchId: "mui-premium",
    title: "Watchlist (MUI X Premium)",
    pinned: [...pinnedLeft.slice(0, 3), ROW_GROUPING_FIELD, ...pinnedLeft.slice(3)],
  },
} as const;

/**
 * Premium groups by this hidden column instead of using tree data (WL-04). Dropping a row on
 * another section writes that section back through `groupingValueSetter` (WL-03).
 */
const sectionCol = {
  field: "section",
  headerName: "Sección",
  width: 120,
  hideable: false,
  groupingValueGetter: (value: string | null) => value ?? NO_SECTION,
  groupingValueSetter: (value: string, row: WatchlistRow) => ({ ...row, section: value === NO_SECTION ? null : value }),
} as GridColDef;

const defaultVisibility = builtInTemplates.find((t) => t.id === DEFAULT_TEMPLATE_ID)!.visibility;
const LONG_PRESS_MS = 550;

function selectedLeafIds(model: GridRowSelectionModel, rows: WatchlistRow[]): number[] {
  if (model.type === "include") return Array.from(model.ids).filter((id): id is number => typeof id === "number");
  return rows.map((r) => r.id).filter((id) => !model.ids.has(id));
}

/**
 * Watchlist on MUI X Data Grid (Pro or Premium). Shared control plane and chrome; only the grid
 * lives here. Pro groups sections with tree data; Premium with row grouping, plus cell selection,
 * clipboard and Excel export.
 */
export function WatchlistPanel({ dragHandleClassName, edition, Grid, ...controls }: WatchlistPanelProps) {
  const config = EDITION[edition];
  const premium = edition === "premium";
  const apiRef = useGridApiRef();
  const adapterRef = useRef<GridAdapter | null>(null);
  const wl = useWatchlistController({ storageKey: config.storageKey, defaultVisibility, adapterRef, benchId: config.benchId });
  const { rows, cards, readOnly, filtersActive, settings, calculatedColumns } = wl;
  // Grouped view (sections) in both editions; `treeData` also drives the grouping column layout.
  const treeData = !cards;
  const defaultGridState = useMemo<GridInitialState>(() => ({ pinnedColumns: { left: [...config.pinned] } }), [config]);

  const [gridKey, setGridKey] = useState(0);
  const [formulaOpen, setFormulaOpen] = useState(false);
  // MUI X reads initialState only on mount; re-mounts (maximize, reset) take the latest saved layout.
  const mountState = useMemo<GridInitialState>(
    () => ({ ...defaultGridState, ...(wl.initialLayout as GridInitialState | undefined) }),
    [wl.initialLayout, defaultGridState],
  );

  // ---- Grid adapter: how the shared watchlist talks to MUI X.
  const adapter = useMemo<GridAdapter>(
    () => ({
      push: (updates) => {
        const api = apiRef.current;
        // Unmounted while minimized; and never pass unknown ids (updateRows would insert them).
        if (!api?.rootElementRef?.current?.isConnected) return;
        const known = updates.filter((u) => api.getRow(u.id) != null);
        if (known.length > 0) api.updateRows(known);
      },
      captureLayout: () => {
        const exported = apiRef.current?.exportState({ exportOnlyDirtyModels: true });
        return exported
          ? { columns: exported.columns, pinnedColumns: exported.pinnedColumns, sorting: exported.sorting, filter: exported.filter }
          : undefined;
      },
      applyLayout: (layout) => apiRef.current?.restoreState(layout as GridInitialState),
      resetLayout: () => setGridKey((k) => k + 1),
      clearGridFilters: () => apiRef.current?.setFilterModel({ items: [] }),
      exportCsv: (fileName) => {
        const fields = buildColumns(calculatedColumns, wl.resolve, treeData)
          .map((c) => c.field)
          .filter((f) => wl.effectiveVisibility[f] !== false && !["flag", "alert", "events", "intraday", "actions"].includes(f));
        apiRef.current?.exportDataAsCsv({
          fileName,
          delimiter: ";",
          utf8WithBom: true,
          fields: treeData ? ["orderbook", ...fields] : fields,
          getRowsToExport: () => rows.map((r) => r.id),
        });
      },
      openFilters: () => apiRef.current?.showFilterPanel(),
      openColumnsPanel: () => apiRef.current?.showPreferences(GridPreferencePanelsValue.columns),
      createCalculatedColumn: () => setFormulaOpen(true),
    }),
    [apiRef, calculatedColumns, wl.resolve, wl.effectiveVisibility, treeData, rows],
  );
  useEffect(() => {
    adapterRef.current = adapter;
  }, [adapter]);

  const createCalculatedColumn = (name: string, expression: string) => {
    const field = `calc_${Date.now().toString(36)}` as const;
    wl.setCalculatedColumns((prev) => [...prev, { field, name, expression }]);
    wl.notify("success", `Columna calculada "${name}" creada`);
    // New columns land at the right edge, usually outside the viewport: bring it into view.
    window.setTimeout(() => {
      const api = apiRef.current;
      const colIndex = api?.getColumnIndex(field, true) ?? -1;
      if (api && colIndex >= 0) api.scrollToIndexes({ colIndex });
    }, 50);
  };

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
    wl.reorderActiveList(ordered);
  }, [apiRef, wl]);

  // ---- Columns.
  const columns = useMemo(() => {
    const base = buildColumns(calculatedColumns, wl.resolve, treeData);
    return premium ? [...base, sectionCol] : base;
  }, [calculatedColumns, wl.resolve, treeData, premium]);
  const columnVisibility = useMemo(
    () => (premium ? { ...wl.effectiveVisibility, section: false } : wl.effectiveVisibility),
    [premium, wl.effectiveVisibility],
  );
  const groupFields = useMemo(() => buildGroupFields(calculatedColumns, treeData), [calculatedColumns, treeData]);
  const { layoutChanged } = wl;
  const columnGroupingModel: GridColumnGroupingModel = useMemo(
    () =>
      Object.entries(groupFields).map(([groupId, fields]) => ({
        groupId,
        headerName: GROUP_LABELS[groupId],
        renderHeaderGroup: () => <GroupHeader groupId={groupId} groupFields={groupFields} onMoved={layoutChanged} />,
        children: fields.map((field) => ({ field })),
      })),
    [groupFields, layoutChanged],
  );

  const rulesByField = useMemo(() => {
    const map = new Map<string, ConditionalRule[]>();
    for (const rule of wl.rules) map.set(rule.field, [...(map.get(rule.field) ?? []), rule]);
    return map;
  }, [wl.rules]);

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
    const openMenu = () => {
      const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
      wl.actions.openContextMenu(row, rect.left + 8, rect.bottom);
    };
    const key = event.shiftKey && event.key === "F10" ? "contextmenu" : event.key;
    if (!wl.handleShortcut(row, key, openMenu)) return;
    event.preventDefault();
    (event as typeof event & { defaultMuiPrevented?: boolean }).defaultMuiPrevented = true;
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
      timer: window.setTimeout(() => wl.actions.openContextMenu(row, clientX, clientY), LONG_PRESS_MS),
    };
  };
  const handlePointerMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    const lp = longPress.current;
    if (lp && Math.hypot(e.clientX - lp.x, e.clientY - lp.y) > 8) cancelLongPress();
  };

  const exportExcel = () => {
    const api = apiRef.current as unknown as { exportDataAsExcel?: (options: object) => Promise<void> } | null;
    void api?.exportDataAsExcel?.({ fileName: `watchlist-${wl.activeList.name}` });
  };

  const selectionModel = useMemo<GridRowSelectionModel>(() => ({ type: "include", ids: new Set(wl.selectedIds) }), [wl.selectedIds]);

  return (
    <WatchlistShell
      wl={wl}
      title={config.title}
      dragHandleClassName={dragHandleClassName}
      {...controls}
      settingsExtra={[
        ...(premium
          ? [
              <MenuItem key="excel" sx={{ fontSize: 12, minHeight: 28 }} onClick={exportExcel}>
                <ListItemText slotProps={{ primary: { sx: { fontSize: 12 } } }}>Exportar Excel</ListItemText>
              </MenuItem>,
            ]
          : []),
        ...calculatedColumns.map((calc) => (
        <MenuItem key={calc.field} sx={{ fontSize: 12, minHeight: 28, pl: 4 }} onClick={(e) => e.stopPropagation()}>
          <ListItemText slotProps={{ primary: { sx: { fontSize: 12 } } }}>ƒ {calc.name}</ListItemText>
          <IconButton
            size="small"
            edge="end"
            aria-label={`Eliminar columna ${calc.name}`}
            onClick={() => wl.setCalculatedColumns((prev) => prev.filter((c) => c.field !== calc.field))}
          >
            <DeleteIcon sx={{ fontSize: 14 }} />
          </IconButton>
        </MenuItem>
        )),
      ]}
    >
      <Box
        sx={{ flex: 1, minHeight: 0 }}
        onContextMenu={(e) => {
          const row = rowFromEvent(e.target);
          if (!row || typeof row.id !== "number") return;
          e.preventDefault();
          wl.actions.openContextMenu(row, e.clientX + 2, e.clientY - 6);
        }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={cancelLongPress}
        onPointerCancel={cancelLongPress}
      >
        <Grid
          key={gridKey}
          apiRef={apiRef}
          aria-label={`Watchlist ${wl.activeList.name}`}
          rows={rows}
          columns={columns}
          treeData={treeData && !premium}
          rowGroupingModel={premium ? (treeData ? ["section"] : []) : undefined}
          cellSelection={premium || undefined}
          getTreeDataPath={(row: WatchlistRow) => (row.section ? [row.section, row.orderbook] : [row.orderbook])}
          setTreeDataPath={(path: string[], row: WatchlistRow) => ({ ...row, section: path.length > 1 ? path[0] : null })}
          groupingColDef={groupingColDef}
          defaultGroupingExpansionDepth={-1}
          rowReordering={!readOnly && !cards && !filtersActive}
          onRowOrderChange={handleRowOrderChange}
          checkboxSelection={!cards}
          disableRowSelectionOnClick={false}
          rowSelectionModel={selectionModel}
          onRowSelectionModelChange={(model) => wl.setSelectedIds(selectedLeafIds(model, rows))}
          isRowSelectable={(p) => typeof p.id === "number"}
          onRowClick={(p) => typeof p.id === "number" && wl.publishLink(p.row as WatchlistRow)}
          onCellKeyDown={handleCellKeyDown}
          columnGroupingModel={cards ? undefined : columnGroupingModel}
          columnVisibilityModel={columnVisibility}
          onColumnVisibilityModelChange={wl.updateColumnVisibility}
          onColumnOrderChange={layoutChanged}
          onColumnWidthChange={layoutChanged}
          onSortModelChange={layoutChanged}
          onPinnedColumnsChange={layoutChanged}
          onFilterModelChange={layoutChanged}
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
          loading={wl.listLoading || wl.demoState === "loading"}
          initialState={mountState}
          slots={{ noRowsOverlay: WatchlistOverlay, noResultsOverlay: WatchlistOverlay }}
          slotProps={{ loadingOverlay: { variant: "skeleton", noRowsVariant: "skeleton" } }}
          hideFooterSelectedRowCount
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
      {formulaOpen && (
        <FormulaDialog
          mode="column"
          sample={rows[0] ?? null}
          resolve={wl.resolve}
          onSubmit={createCalculatedColumn}
          onClose={() => setFormulaOpen(false)}
        />
      )}
    </WatchlistShell>
  );
}
