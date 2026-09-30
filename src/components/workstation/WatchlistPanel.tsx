"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Box,
  Chip,
  IconButton,
  Menu,
  MenuItem,
  Snackbar,
  Stack,
  Tab,
  Tabs,
  Tooltip,
} from "@mui/material";
import type { ChipProps } from "@mui/material";
import LinkIcon from "@mui/icons-material/Link";
import MenuIcon from "@mui/icons-material/Menu";
import DownloadIcon from "@mui/icons-material/Download";
import AddCircleOutlineIcon from "@mui/icons-material/AddCircleOutlined";
import FlagIcon from "@mui/icons-material/Flag";
import FilterListIcon from "@mui/icons-material/FilterList";
import SearchIcon from "@mui/icons-material/Search";
import ArrowDropUpIcon from "@mui/icons-material/ArrowDropUp";
import ArrowDropDownIcon from "@mui/icons-material/ArrowDropDown";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import { useGridApiRef, type GridColDef, type GridColumnGroupingModel } from "@mui/x-data-grid-pro";
import { Button, DataGridPro, Select, TextField, Typography } from "@nuam/common-fe-lib-components";
import {
  watchlistInstrumentRows,
  type WatchlistCountry,
  type WatchlistFlag,
  type WatchlistInstrumentRow,
  type WatchlistSession,
} from "@/lib/mock-data";
import { compactDataGridSx } from "./dataGridStyles";
import { PanelWindow, type PanelWindowControls } from "./panels/PanelWindow";

const localeByCountry: Record<WatchlistCountry, string> = {
  CL: "es-CL",
  PE: "es-PE",
  CO: "es-CO",
};

function formatPrice(value: number | null, country: WatchlistCountry) {
  if (value == null) return "—";
  return new Intl.NumberFormat(localeByCountry[country], {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

function formatInt(value: number | null, country: WatchlistCountry) {
  if (value == null) return "—";
  return new Intl.NumberFormat(localeByCountry[country]).format(Math.round(value));
}

function formatPercent(value: number | null) {
  if (value == null) return "—";
  return `${value >= 0 ? "+" : ""}${value.toFixed(2)}%`;
}

const sessionColor: Record<WatchlistSession, ChipProps["color"]> = {
  "Pre-apertura": "info",
  Subasta: "warning",
  Continuo: "success",
  Cerrado: "default",
  Suspendido: "error",
};

const flagOrder: WatchlistFlag[] = ["none", "green", "yellow", "red"];
const flagColorKey: Record<WatchlistFlag, string> = {
  none: "action.disabled",
  green: "success.main",
  yellow: "warning.main",
  red: "error.main",
};

const templateOptions = [
  { value: "completa", label: "Completa" },
  { value: "compacta", label: "Compacta" },
];

// MUI X never makes a column-group header draggable (hardcoded in GridColumnGroupHeader),
// so moving a whole group is done with explicit ◀ ▶ buttons instead of native drag & drop.
const GROUP_FIELDS: Record<string, string[]> = {
  instrument: ["orderbook", "description", "status", "session", "settlement"],
  "trade-info": ["last", "netChange", "changePercent", "open", "high", "low", "previousClose", "lastTradeTime"],
  market: ["bidQty", "bidPrice", "askPrice", "askQty", "spread"],
  other: ["volume", "amount", "referencePrice"],
};
const GROUP_LABELS: Record<string, string> = {
  instrument: "Instrumento",
  "trade-info": "Información de negociación",
  market: "Mercado",
  other: "Otros",
};
const GROUP_ORDER_IDS = Object.keys(GROUP_FIELDS);

const listTabs = [
  { value: "renta-variable", label: "Renta Variable" },
  { value: "renta-fija", label: "Renta Fija" },
  { value: "derivados", label: "Derivados" },
] as const;

type ListTab = (typeof listTabs)[number]["value"];

interface WatchlistPanelProps extends PanelWindowControls {
  dragHandleClassName?: string;
}

function priceCell(value: number | null, country: WatchlistCountry) {
  return (
    <Typography variant="caption" sx={{ color: value == null ? "text.disabled" : "text.primary" }}>
      {formatPrice(value, country)}
    </Typography>
  );
}

export function WatchlistPanel({ dragHandleClassName, ...controls }: WatchlistPanelProps) {
  const apiRef = useGridApiRef();
  const [rows, setRows] = useState<WatchlistInstrumentRow[]>(watchlistInstrumentRows);
  const rowsRef = useRef(rows);
  useEffect(() => {
    rowsRef.current = rows;
  }, [rows]);

  const [flashMap, setFlashMap] = useState<Record<number, "up" | "down">>({});
  const [search, setSearch] = useState("");
  const [activeList, setActiveList] = useState<ListTab>("renta-variable");
  const [template, setTemplate] = useState(templateOptions[0]);
  const [onlyFlagged, setOnlyFlagged] = useState(false);
  const [contextMenu, setContextMenu] = useState<{
    mouseX: number;
    mouseY: number;
    row: WatchlistInstrumentRow;
  } | null>(null);
  const [snackbar, setSnackbar] = useState<string | null>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  // Simulates live ticks (WL-14) with a brief flash on the updated cell (WL-15).
  useEffect(() => {
    const interval = setInterval(() => {
      const current = rowsRef.current;
      const eligible = current.filter((r) => r.status === "ENABLED" && r.last != null);
      if (eligible.length === 0) return;
      const target = eligible[Math.floor(Math.random() * eligible.length)];
      const direction = Math.random() > 0.5 ? 1 : -1;
      const delta = Math.max(0.01, (target.last ?? 1) * 0.0015 * (1 + Math.random()));
      const newLast = Math.max(0.01, (target.last ?? 0) + direction * delta);
      const newNetChange = newLast - (target.previousClose ?? newLast);
      const newChangePercent = target.previousClose
        ? (newNetChange / target.previousClose) * 100
        : 0;

      setRows((prev) =>
        prev.map((r) =>
          r.id === target.id
            ? {
                ...r,
                last: newLast,
                netChange: newNetChange,
                changePercent: newChangePercent,
                high: Math.max(r.high ?? newLast, newLast),
                low: Math.min(r.low ?? newLast, newLast),
                lastTradeTime: new Date().toLocaleTimeString("es-CL", { hour12: false }),
              }
            : r,
        ),
      );
      setFlashMap((fm) => ({ ...fm, [target.id]: direction > 0 ? "up" : "down" }));
      window.setTimeout(() => {
        setFlashMap((fm) => {
          if (!(target.id in fm)) return fm;
          const next = { ...fm };
          delete next[target.id];
          return next;
        });
      }, 900);
    }, 2500);
    return () => clearInterval(interval);
  }, []);

  const cycleFlag = useCallback((id: number) => {
    setRows((prev) =>
      prev.map((r) => {
        if (r.id !== id) return r;
        const nextIndex = (flagOrder.indexOf(r.flag) + 1) % flagOrder.length;
        return { ...r, flag: flagOrder[nextIndex] };
      }),
    );
  }, []);

  const removeRow = useCallback((id: number) => {
    setRows((prev) => prev.filter((r) => r.id !== id));
  }, []);

  // Moves an entire column group (all its child columns, as a block) left/right,
  // swapping it with the adjacent group — the closest equivalent to dragging the
  // group header, which MUI X's DataGrid does not support natively.
  const moveGroup = useCallback((groupId: string, direction: -1 | 1) => {
    const api = apiRef.current;
    if (!api) return;
    const allFields = api.getAllColumns().map((c) => c.field);
    const positions = GROUP_ORDER_IDS.map((gid) => ({
      gid,
      start: Math.min(...GROUP_FIELDS[gid].map((f) => allFields.indexOf(f)).filter((i) => i >= 0)),
    })).sort((a, b) => a.start - b.start);
    const currentPos = positions.findIndex((p) => p.gid === groupId);
    const targetPos = currentPos + direction;
    if (currentPos === -1 || targetPos < 0 || targetPos >= positions.length) return;

    const thisFields = GROUP_FIELDS[groupId];
    const otherFields = GROUP_FIELDS[positions[targetPos].gid];
    const blockStart = Math.min(positions[currentPos].start, positions[targetPos].start);
    const newBlockOrder = direction === -1 ? [...thisFields, ...otherFields] : [...otherFields, ...thisFields];
    newBlockOrder.forEach((field, i) => {
      api.setColumnIndex(field, blockStart + i);
    });
  }, [apiRef]);

  const renderGroupHeader = useCallback(
    (groupId: string) => () => (
      <Stack direction="row" spacing={0} sx={{ alignItems: "center", justifyContent: "center", width: "100%" }}>
        <IconButton
          size="small"
          sx={{ p: 0 }}
          onClick={(e) => {
            e.stopPropagation();
            moveGroup(groupId, -1);
          }}
        >
          <ChevronLeftIcon sx={{ fontSize: 14 }} />
        </IconButton>
        <Typography variant="caption" sx={{ fontWeight: 700, fontSize: 10 }}>
          {GROUP_LABELS[groupId]}
        </Typography>
        <IconButton
          size="small"
          sx={{ p: 0 }}
          onClick={(e) => {
            e.stopPropagation();
            moveGroup(groupId, 1);
          }}
        >
          <ChevronRightIcon sx={{ fontSize: 14 }} />
        </IconButton>
      </Stack>
    ),
    [moveGroup],
  );

  // Other lists are empty on purpose — demonstrates the widget's "empty" state (WL-34).
  const filteredRows = useMemo(() => {
    if (activeList !== "renta-variable") return [];
    return rows.filter((r) => {
      if (onlyFlagged && r.flag === "none") return false;
      if (search.trim()) {
        const q = search.trim().toLowerCase();
        return r.orderbook.toLowerCase().includes(q) || r.description.toLowerCase().includes(q);
      }
      return true;
    });
  }, [rows, activeList, onlyFlagged, search]);

  const columnVisibilityModel = useMemo(() => {
    if (template.value === "completa") return undefined;
    return {
      description: false,
      settlement: false,
      open: false,
      high: false,
      low: false,
      previousClose: false,
      volume: false,
      amount: false,
      spread: false,
      referencePrice: false,
      lastTradeTime: false,
    };
  }, [template]);

  const handleExportCsv = () => {
    const header = ["Nemotécnico", "Descripción", "Estado", "Sesión", "Último", "Var.", "Var. %"];
    const lines = filteredRows.map((r) =>
      [r.orderbook, r.description, r.status, r.session, r.last ?? "", r.netChange ?? "", r.changePercent ?? ""].join(";"),
    );
    const csv = [header.join(";"), ...lines].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "watchlist.csv";
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleGridContextMenu = (event: React.MouseEvent<HTMLDivElement>) => {
    const target = (event.target as HTMLElement).closest<HTMLElement>(".MuiDataGrid-row");
    if (!target) return;
    event.preventDefault();
    const rowId = target.getAttribute("data-id");
    const row = filteredRows.find((r) => String(r.id) === rowId);
    if (!row) return;
    setContextMenu({ mouseX: event.clientX + 2, mouseY: event.clientY - 6, row });
  };

  const closeContextMenu = () => setContextMenu(null);

  const mockAction = (label: string, row: WatchlistInstrumentRow) => {
    setSnackbar(`${label}: ${row.orderbook} (demo)`);
    closeContextMenu();
  };

  const columns: GridColDef<WatchlistInstrumentRow>[] = useMemo(
    () => [
      {
        field: "flag",
        headerName: "",
        width: 36,
        sortable: false,
        filterable: false,
        disableColumnMenu: true,
        renderCell: (params) => (
          <Tooltip title="Marcar instrumento">
            <IconButton
              size="small"
              sx={{ p: 0.25 }}
              onClick={(e) => {
                e.stopPropagation();
                cycleFlag(params.row.id);
              }}
            >
              <FlagIcon sx={{ fontSize: 16, color: flagColorKey[params.value as WatchlistFlag] }} />
            </IconButton>
          </Tooltip>
        ),
      },
      {
        field: "orderbook",
        headerName: "Orderbook",
        width: 150,
        renderCell: (params) => (
          <Typography variant="caption" sx={{ fontWeight: 700 }}>
            {params.value}
          </Typography>
        ),
      },
      { field: "description", headerName: "Descripción", flex: 1, minWidth: 220 },
      {
        field: "status",
        headerName: "Estado",
        width: 100,
        renderCell: (params) => (
          <Chip
            size="small"
            label={params.value}
            color={params.value === "ENABLED" ? "success" : "default"}
            sx={{ height: 16, fontSize: 9, fontWeight: 700 }}
          />
        ),
      },
      {
        field: "session",
        headerName: "Sesión",
        width: 110,
        renderCell: (params) => (
          <Chip
            size="small"
            variant="outlined"
            label={params.value}
            color={sessionColor[params.value as WatchlistSession]}
            sx={{ height: 16, fontSize: 9, fontWeight: 700 }}
          />
        ),
      },
      { field: "settlement", headerName: "Liquidación", width: 100 },
      {
        field: "last",
        headerName: "Último",
        width: 100,
        align: "right",
        headerAlign: "right",
        renderCell: (params) => (
          <Typography
            variant="caption"
            sx={{ fontWeight: 700, color: params.row.last == null ? "text.disabled" : "text.primary" }}
          >
            {formatPrice(params.row.last, params.row.country)}
          </Typography>
        ),
      },
      {
        field: "netChange",
        headerName: "Var.",
        width: 90,
        align: "right",
        headerAlign: "right",
        renderCell: (params) => {
          const value = params.row.netChange;
          if (value == null) return priceCell(null, params.row.country);
          const positive = value >= 0;
          return (
            <Typography variant="caption" sx={{ color: positive ? "success.dark" : "error.dark", fontWeight: 600 }}>
              {formatPrice(value, params.row.country)}
            </Typography>
          );
        },
      },
      {
        field: "changePercent",
        headerName: "Var. %",
        width: 95,
        align: "right",
        headerAlign: "right",
        renderCell: (params) => {
          const value = params.row.changePercent;
          if (value == null)
            return (
              <Typography variant="caption" sx={{ color: "text.disabled" }}>
                —
              </Typography>
            );
          const positive = value >= 0;
          return (
            <Stack direction="row" spacing={0} sx={{ alignItems: "center", justifyContent: "flex-end", width: "100%" }}>
              {positive ? (
                <ArrowDropUpIcon sx={{ fontSize: 16, color: "success.dark" }} />
              ) : (
                <ArrowDropDownIcon sx={{ fontSize: 16, color: "error.dark" }} />
              )}
              <Typography variant="caption" sx={{ color: positive ? "success.dark" : "error.dark", fontWeight: 600 }}>
                {formatPercent(value)}
              </Typography>
            </Stack>
          );
        },
      },
      {
        field: "open",
        headerName: "Apertura",
        width: 100,
        align: "right",
        headerAlign: "right",
        renderCell: (params) => priceCell(params.row.open, params.row.country),
      },
      {
        field: "high",
        headerName: "Máximo",
        width: 100,
        align: "right",
        headerAlign: "right",
        renderCell: (params) => priceCell(params.row.high, params.row.country),
      },
      {
        field: "low",
        headerName: "Mínimo",
        width: 100,
        align: "right",
        headerAlign: "right",
        renderCell: (params) => priceCell(params.row.low, params.row.country),
      },
      {
        field: "previousClose",
        headerName: "Cierre ant.",
        width: 100,
        align: "right",
        headerAlign: "right",
        renderCell: (params) => priceCell(params.row.previousClose, params.row.country),
      },
      {
        field: "bidQty",
        headerName: "Cant. compra",
        width: 110,
        align: "right",
        headerAlign: "right",
        renderCell: (params) => (
          <Typography variant="caption" sx={{ color: "text.secondary" }}>
            {formatInt(params.row.bidQty, params.row.country)}
          </Typography>
        ),
      },
      {
        field: "bidPrice",
        headerName: "Compra",
        width: 90,
        align: "right",
        headerAlign: "right",
        renderCell: (params) => (
          <Typography variant="caption" sx={{ color: "success.dark", fontWeight: 600 }}>
            {formatPrice(params.row.bidPrice, params.row.country)}
          </Typography>
        ),
      },
      {
        field: "askPrice",
        headerName: "Venta",
        width: 90,
        align: "right",
        headerAlign: "right",
        renderCell: (params) => (
          <Typography variant="caption" sx={{ color: "error.dark", fontWeight: 600 }}>
            {formatPrice(params.row.askPrice, params.row.country)}
          </Typography>
        ),
      },
      {
        field: "askQty",
        headerName: "Cant. venta",
        width: 110,
        align: "right",
        headerAlign: "right",
        renderCell: (params) => (
          <Typography variant="caption" sx={{ color: "text.secondary" }}>
            {formatInt(params.row.askQty, params.row.country)}
          </Typography>
        ),
      },
      {
        field: "spread",
        headerName: "Spread",
        width: 80,
        align: "right",
        headerAlign: "right",
        renderCell: (params) => priceCell(params.row.spread, params.row.country),
      },
      {
        field: "volume",
        headerName: "Volumen",
        width: 110,
        align: "right",
        headerAlign: "right",
        renderCell: (params) => (
          <Typography variant="caption" sx={{ color: "text.secondary" }}>
            {formatInt(params.row.volume, params.row.country)}
          </Typography>
        ),
      },
      {
        field: "amount",
        headerName: "Monto",
        width: 130,
        align: "right",
        headerAlign: "right",
        renderCell: (params) => (
          <Typography variant="caption" sx={{ color: "text.secondary" }}>
            {formatInt(params.row.amount, params.row.country)}
          </Typography>
        ),
      },
      {
        field: "referencePrice",
        headerName: "Precio ref.",
        width: 100,
        align: "right",
        headerAlign: "right",
        renderCell: (params) => priceCell(params.row.referencePrice, params.row.country),
      },
      { field: "lastTradeTime", headerName: "Hora", width: 90 },
      {
        field: "actions",
        headerName: "",
        width: 120,
        sortable: false,
        filterable: false,
        disableColumnMenu: true,
        renderCell: (params) => (
          <Stack direction="row" spacing={0.5} className="row-actions" sx={{ alignItems: "center" }}>
            <Button
              size="small"
              variant="contained"
              color="success"
              sx={{ minWidth: 0, px: 0.75, py: 0, fontSize: 10, lineHeight: 1.6 }}
              onClick={(e) => {
                e.stopPropagation();
                setSnackbar(
                  `Orden mock: Compra ${params.row.orderbook} @ ${
                    params.row.askPrice ?? params.row.referencePrice ?? "-"
                  }`,
                );
              }}
            >
              Compra
            </Button>
            <Button
              size="small"
              variant="contained"
              color="error"
              sx={{ minWidth: 0, px: 0.75, py: 0, fontSize: 10, lineHeight: 1.6 }}
              onClick={(e) => {
                e.stopPropagation();
                setSnackbar(
                  `Orden mock: Venta ${params.row.orderbook} @ ${
                    params.row.bidPrice ?? params.row.referencePrice ?? "-"
                  }`,
                );
              }}
            >
              Venta
            </Button>
          </Stack>
        ),
      },
    ],
    [cycleFlag],
  );

  const columnGroupingModel: GridColumnGroupingModel = GROUP_ORDER_IDS.map((groupId) => ({
    groupId,
    headerName: GROUP_LABELS[groupId],
    renderHeaderGroup: renderGroupHeader(groupId),
    children: GROUP_FIELDS[groupId].map((field) => ({ field })),
  }));

  return (
    <PanelWindow
      title="Watchlist"
      dragHandleClassName={dragHandleClassName}
      {...controls}
      headerExtra={
        <>
          <Tooltip title="Copiar enlace">
            <IconButton size="small" sx={{ p: 0.25 }}>
              <LinkIcon sx={{ fontSize: 14 }} />
            </IconButton>
          </Tooltip>
          <Tooltip title="Más opciones">
            <IconButton size="small" sx={{ p: 0.25 }}>
              <MenuIcon sx={{ fontSize: 14 }} />
            </IconButton>
          </Tooltip>
        </>
      }
    >
      <Stack direction="row" spacing={0} sx={{ alignItems: "center", px: 1, py: 0.5 }}>
        <Tabs
          value={activeList}
          onChange={(_, value) => setActiveList(value)}
          sx={{ minHeight: 26, "& .MuiTab-root": { minHeight: 26, py: 0, px: 1, fontSize: 11, fontWeight: 700 } }}
        >
          {listTabs.map((tab) => (
            <Tab key={tab.value} value={tab.value} label={tab.label} />
          ))}
        </Tabs>
        <TextField
          inputRef={searchRef}
          size="small"
          placeholder="Buscar..."
          value={search}
          onChange={(value) => setSearch(String(value))}
          sx={{ width: 160, ml: "2.5rem" }}
          slotProps={{
            input: {
              startAdornment: <SearchIcon sx={{ fontSize: 14, color: "text.secondary", mr: 0.25 }} />,
              sx: { fontSize: 11 },
            },
          }}
        />
        <Box sx={{ flex: 1 }} />
        <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
          <Select
            size="small"
            options={templateOptions}
            value={template}
            onChange={(value) => setTemplate(value as typeof templateOptions[number])}
            formControlProps={{ sx: { minWidth: 78 } }}
            sx={{ fontSize: 11 }}
          />
          <Button
            variant="text"
            color="primary"
            size="small"
            startIcon={<FilterListIcon sx={{ fontSize: 14 }} />}
            onClick={() => apiRef.current?.showFilterPanel()}
            sx={{ fontSize: 11, minWidth: 0, px: 0.75, whiteSpace: "nowrap" }}
          >
            Filtros
          </Button>
          <Tooltip title="Exportar CSV">
            <IconButton size="small" sx={{ p: 0.25 }} onClick={handleExportCsv}>
              <DownloadIcon sx={{ fontSize: 16 }} />
            </IconButton>
          </Tooltip>
          <Tooltip title="Agregar instrumento">
            <IconButton size="small" sx={{ p: 0.25 }} onClick={() => searchRef.current?.focus()}>
              <AddCircleOutlineIcon sx={{ fontSize: 16 }} />
            </IconButton>
          </Tooltip>
          <Tooltip title={onlyFlagged ? "Mostrar todos" : "Solo marcados"}>
            <IconButton
              size="small"
              sx={{ p: 0.25 }}
              color={onlyFlagged ? "primary" : "default"}
              onClick={() => setOnlyFlagged((v) => !v)}
            >
              <FlagIcon sx={{ fontSize: 16 }} />
            </IconButton>
          </Tooltip>
        </Stack>
      </Stack>

      <Box sx={{ flex: 1, minHeight: 0 }} onContextMenu={handleGridContextMenu}>
        <DataGridPro
          apiRef={apiRef}
          rows={filteredRows}
          columns={columns}
          columnGroupingModel={columnGroupingModel}
          columnVisibilityModel={columnVisibilityModel}
          getRowClassName={(params) =>
            `watchlist-row ${params.row.session === "Suspendido" ? "watchlist-row-suspended" : ""}`
          }
          getCellClassName={(params) => {
            if (params.field !== "last") return "";
            const direction = flashMap[params.row.id as number];
            if (!direction) return "";
            return direction === "up" ? "cell-flash-up" : "cell-flash-down";
          }}
          rowHeight={22}
          columnHeaderHeight={22}
          columnGroupHeaderHeight={18}
          pagination
          initialState={{
            pagination: { paginationModel: { pageSize: 10, page: 0 } },
            pinnedColumns: { left: ["flag", "orderbook"] },
          }}
          pageSizeOptions={[10, 25, 50]}
          language="es"
          enableColumnMenu
          sx={{
            ...compactDataGridSx,
            fontSize: 11,
            "& .MuiDataGrid-cell": { fontSize: 11, paddingLeft: "6px", paddingRight: "6px" },
            "& .MuiDataGrid-columnHeaderTitle": { fontSize: 10 },
            "& .MuiDataGrid-columnHeader": { paddingLeft: "6px", paddingRight: "6px" },
            "& .MuiDataGrid-columnHeader button": { padding: "4px", fontSize: "0.75rem" },
          }}
        />
      </Box>

      <Menu
        open={Boolean(contextMenu)}
        onClose={closeContextMenu}
        anchorReference="anchorPosition"
        anchorPosition={contextMenu ? { top: contextMenu.mouseY, left: contextMenu.mouseX } : undefined}
      >
        {contextMenu && [
          <MenuItem key="operar" onClick={() => mockAction("Ticket de orden abierto", contextMenu.row)}>
            Operar
          </MenuItem>,
          <MenuItem key="alerta" onClick={() => mockAction("Alerta creada", contextMenu.row)}>
            Crear alerta
          </MenuItem>,
          <MenuItem key="grafico" onClick={() => mockAction("Abriendo gráfico", contextMenu.row)}>
            Gráfico
          </MenuItem>,
          <MenuItem key="libro" onClick={() => mockAction("Abriendo libro de órdenes", contextMenu.row)}>
            Libro de órdenes
          </MenuItem>,
          <MenuItem key="noticias" onClick={() => mockAction("Abriendo noticias", contextMenu.row)}>
            Noticias
          </MenuItem>,
          <MenuItem key="ficha" onClick={() => mockAction("Abriendo ficha", contextMenu.row)}>
            Ficha
          </MenuItem>,
          <MenuItem
            key="marcar"
            onClick={() => {
              cycleFlag(contextMenu.row.id);
              closeContextMenu();
            }}
          >
            Marcar / quitar marca
          </MenuItem>,
          <MenuItem
            key="quitar"
            onClick={() => {
              removeRow(contextMenu.row.id);
              closeContextMenu();
            }}
          >
            Quitar de la lista
          </MenuItem>,
        ]}
      </Menu>

      <Snackbar
        open={Boolean(snackbar)}
        autoHideDuration={2500}
        onClose={() => setSnackbar(null)}
        message={snackbar ?? ""}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      />
    </PanelWindow>
  );
}
