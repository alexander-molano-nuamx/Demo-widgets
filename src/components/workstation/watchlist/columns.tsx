"use client";

import { Box, ButtonBase, IconButton, Stack, Tooltip } from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import EditIcon from "@mui/icons-material/Edit";
import {
  GRID_CHECKBOX_SELECTION_FIELD,
  GRID_REORDER_COL_DEF,
  GRID_TREE_DATA_GROUPING_FIELD,
  type GridApiPro,
  type GridColDef,
  type GridColumnVisibilityModel,
  type GridGroupNode,
  type GridRenderCellParams,
  useGridApiContext,
} from "@mui/x-data-grid-pro";
import { Button, Typography } from "@nuam/common-fe-lib-components";
import { evaluateFormula, parseFormula } from "@/lib/watchlist/formula";
import { formatExchangeTime, formatInt, formatNumber, formatSigned } from "@/lib/watchlist/format";
import { exchangeByCountry, type CalculatedColumn, type Instrument, type WatchlistRow } from "@/lib/watchlist/model";
import {
  AlertIndicator,
  ChangeValue,
  EventIcons,
  FlagButton,
  FlashValue,
  LastPriceValue,
  MaskedValue,
  PriceValue,
  QualityBadge,
  SessionBadge,
  SparklineCell,
} from "./cells";
import { INSTRUMENT_DRAG_MIME, type InstrumentDragPayloadV1 } from "./ListTabs";
import { directionColor, marketColor } from "./tokens";
import { useWatchlistActions } from "./WatchlistContext";

type Params = GridRenderCellParams<WatchlistRow>;
type Col = GridColDef<WatchlistRow>;

const right = { align: "right", headerAlign: "right" } as const;

/** Bid/Ask cell: click opens the prefilled ticket — Ask buys, Bid sells (WL-20). */
function QuoteCell({ row, side }: { row: WatchlistRow; side: "bid" | "ask" }) {
  const { openTicket } = useWatchlistActions();
  if (!row.hasPermission) return <MaskedValue row={row} />;
  const price = side === "bid" ? row.bidPrice : row.askPrice;
  const action = side === "bid" ? "Vender" : "Comprar";
  return (
    <FlashValue value={price}>
      <Tooltip title={price == null ? "" : `${action} ${row.orderbook} a ${formatNumber(price, row.country, row.decimals)}`}>
        <ButtonBase
          disabled={price == null}
          aria-label={`${action} ${row.orderbook} a ${formatNumber(price, row.country, row.decimals)}`}
          onClick={(e) => {
            e.stopPropagation();
            openTicket(row, side === "bid" ? "sell" : "buy");
          }}
          sx={{
            fontSize: 11,
            fontWeight: 600,
            px: 0.5,
            borderRadius: 0.5,
            color: price == null ? "text.disabled" : side === "bid" ? marketColor.up : marketColor.down,
            "&:hover": { textDecoration: "underline" },
          }}
        >
          {formatNumber(price, row.country, row.decimals)}
        </ButtonBase>
      </Tooltip>
    </FlashValue>
  );
}

function RowActions({ row }: { row: WatchlistRow }) {
  const { openTicket } = useWatchlistActions();
  const disabled = !row.hasPermission || row.status !== "ENABLED";
  return (
    <Stack direction="row" spacing={0.5} className="row-actions" sx={{ alignItems: "center" }}>
      <Button
        size="small"
        variant="contained"
        color="success"
        disabled={disabled}
        aria-label={`Comprar ${row.orderbook}`}
        sx={{ minWidth: 0, px: 0.75, py: 0, fontSize: 10, lineHeight: 1.6 }}
        onClick={(e) => {
          e.stopPropagation();
          openTicket(row, "buy");
        }}
      >
        Compra
      </Button>
      <Button
        size="small"
        variant="contained"
        color="error"
        disabled={disabled}
        aria-label={`Vender ${row.orderbook}`}
        sx={{ minWidth: 0, px: 0.75, py: 0, fontSize: 10, lineHeight: 1.6 }}
        onClick={(e) => {
          e.stopPropagation();
          openTicket(row, "sell");
        }}
      >
        Venta
      </Button>
    </Stack>
  );
}

/** Tree-data grouping cell: collapsible section headers and draggable instrument leaves (WL-04, WL-25). */
function NemoCell(params: Params) {
  const { renameSection, readOnly, dragIdsFor, activeListId } = useWatchlistActions();
  const node = params.rowNode;

  if (node.type === "group") {
    const group = node as GridGroupNode;
    const section = String(group.groupingKey ?? "");
    return (
      <Stack direction="row" sx={{ alignItems: "center", width: "100%", gap: 0.25 }}>
        <IconButton
          size="small"
          sx={{ p: 0 }}
          aria-label={group.childrenExpanded ? `Contraer sección ${section}` : `Expandir sección ${section}`}
          aria-expanded={group.childrenExpanded}
          onClick={(e) => {
            e.stopPropagation();
            (params.api as GridApiPro).setRowChildrenExpansion(params.id, !group.childrenExpanded);
          }}
        >
          {group.childrenExpanded ? <ExpandMoreIcon sx={{ fontSize: 16 }} /> : <ChevronRightIcon sx={{ fontSize: 16 }} />}
        </IconButton>
        <Typography variant="caption" noWrap sx={{ fontWeight: 700, flex: 1 }}>
          {section} ({group.children.length})
        </Typography>
        {!readOnly && (
          <Tooltip title="Renombrar sección">
            <IconButton
              size="small"
              sx={{ p: 0 }}
              aria-label={`Renombrar sección ${section}`}
              onClick={(e) => {
                e.stopPropagation();
                renameSection(section);
              }}
            >
              <EditIcon sx={{ fontSize: 12 }} />
            </IconButton>
          </Tooltip>
        )}
      </Stack>
    );
  }

  const row = params.row;
  return (
    <Box
      draggable
      onDragStart={(e) => {
        const ids = dragIdsFor(row.id);
        const orderbooks = ids.map((id) => (id === row.id ? row.orderbook : String(params.api.getRow(id)?.orderbook ?? "")));
        const payload: InstrumentDragPayloadV1 = { version: 1, ids, orderbooks, sourceListId: activeListId };
        e.dataTransfer.setData(INSTRUMENT_DRAG_MIME, JSON.stringify(payload));
        e.dataTransfer.setData("text/plain", orderbooks.join("\n"));
        e.dataTransfer.effectAllowed = "copyMove";
      }}
      title="Arrastra a otra lista o widget"
      sx={{ display: "flex", alignItems: "center", gap: 0.25, pl: node.depth * 1.5, cursor: "grab", minWidth: 0 }}
    >
      <Typography variant="caption" noWrap sx={{ fontWeight: 700 }}>
        {row.orderbook}
      </Typography>
      {row.syntheticExpression && (
        <Tooltip title={`Sintético: ${row.syntheticExpression}`}>
          <Typography variant="caption" sx={{ color: "info.dark", fontWeight: 700 }}>
            ƒ
          </Typography>
        </Tooltip>
      )}
    </Box>
  );
}

export const groupingColDef: Partial<Col> = {
  headerName: "Nemotécnico",
  width: 170,
  renderCell: (params) => <NemoCell {...params} />,
};

/** Flat-list nemotécnico column used when tree data is off (card view). */
const orderbookCol: Col = {
  field: "orderbook",
  headerName: "Nemotécnico",
  width: 150,
  renderCell: (p: Params) => (
    <Typography variant="caption" sx={{ fontWeight: 700 }}>
      {p.value}
    </Typography>
  ),
};

export function buildColumns(
  calculated: CalculatedColumn[],
  resolve: (orderbook: string) => Instrument | undefined,
  treeData: boolean,
): Col[] {
  const calcCols: Col[] = calculated.flatMap((calc) => {
    const parsed = parseFormula(calc.expression);
    if (!parsed.ok) return [];
    return [
      {
        field: calc.field,
        headerName: calc.name,
        description: `Columna calculada: ${calc.expression}`,
        width: 110,
        type: "number",
        ...right,
        valueGetter: (_value: unknown, row: WatchlistRow) => evaluateFormula(parsed.ast, row, resolve),
        renderCell: (p: Params) =>
          p.row.hasPermission ? (
            <Typography variant="caption" sx={{ color: "info.dark", fontWeight: 600 }}>
              {formatNumber(p.value as number | null, p.row.country, 2)}
            </Typography>
          ) : (
            <MaskedValue row={p.row} />
          ),
      } satisfies Col,
    ];
  });

  return [
    {
      field: "flag",
      headerName: "Marca",
      renderHeader: () => <span aria-label="Marca" />,
      width: 36,
      sortable: false,
      disableColumnMenu: true,
      type: "singleSelect",
      valueOptions: ["none", "green", "yellow", "red", "blue"],
      renderCell: (p: Params) => (p.rowNode.type === "group" ? null : <FlagButton row={p.row} />),
    },
    ...(treeData ? [] : [orderbookCol]),
    {
      field: "alert",
      headerName: "Alerta",
      width: 46,
      sortable: false,
      renderCell: (p: Params) => (p.rowNode.type === "group" ? null : <AlertIndicator row={p.row} />),
    },
    {
      field: "events",
      headerName: "Eventos",
      width: 64,
      sortable: false,
      filterable: false,
      renderCell: (p: Params) => (p.rowNode.type === "group" ? null : <EventIcons row={p.row} />),
    },
    { field: "description", headerName: "Descripción", flex: 1, minWidth: 200 },
    { field: "assetClass", headerName: "Clase", width: 60, type: "singleSelect", valueOptions: ["RV", "RF", "ETF", "DER"] },
    {
      field: "status",
      headerName: "Estado",
      width: 88,
      renderCell: (p: Params) =>
        p.rowNode.type === "group" ? null : (
          <Typography variant="caption" sx={{ fontWeight: 700, color: p.value === "ENABLED" ? marketColor.up : "text.disabled" }}>
            {p.value === "ENABLED" ? "Habilitado" : "Deshab."}
          </Typography>
        ),
    },
    {
      field: "session",
      headerName: "Sesión",
      width: 104,
      renderCell: (p: Params) => (p.rowNode.type === "group" ? null : <SessionBadge row={p.row} />),
    },
    {
      field: "quality",
      headerName: "Dato",
      width: 78,
      description: "Calidad del dato: tiempo real, diferido o desactualizado",
      renderCell: (p: Params) => (p.rowNode.type === "group" ? null : <QualityBadge row={p.row} />),
    },
    { field: "currency", headerName: "Moneda", width: 64 },
    { field: "settlement", headerName: "Liquidación", width: 84 },
    {
      field: "last",
      headerName: "Último",
      width: 100,
      type: "number",
      ...right,
      renderCell: (p: Params) => (p.rowNode.type === "group" ? null : <LastPriceValue row={p.row} />),
    },
    {
      field: "netChange",
      headerName: "Var.",
      width: 84,
      type: "number",
      ...right,
      renderCell: (p: Params) => (p.rowNode.type === "group" ? null : <ChangeValue row={p.row} />),
    },
    {
      field: "changePercent",
      headerName: "Var. %",
      width: 92,
      type: "number",
      ...right,
      renderCell: (p: Params) =>
        p.rowNode.type === "group" ? null : (
          <FlashValue value={p.row.hasPermission ? p.row.changePercent : null}>
            <ChangeValue row={p.row} percent />
          </FlashValue>
        ),
    },
    {
      field: "intraday",
      headerName: "Intradía",
      width: 84,
      sortable: false,
      filterable: false,
      renderCell: (p: Params) =>
        p.rowNode.type === "group" ? null : <SparklineCell data={p.row.intraday} hasPermission={p.row.hasPermission} />,
    },
    ...(
      [
        ["open", "Apertura"],
        ["high", "Máximo"],
        ["low", "Mínimo"],
        ["previousClose", "Cierre ant."],
      ] as const
    ).map(
      ([field, headerName]): Col => ({
        field,
        headerName,
        width: 92,
        type: "number",
        ...right,
        renderCell: (p: Params) => (p.rowNode.type === "group" ? null : <PriceValue row={p.row} value={p.row[field]} />),
      }),
    ),
    {
      field: "lastTradeAt",
      headerName: "Hora",
      description: "Hora del último trade en la zona horaria de cada bolsa",
      width: 84,
      type: "number",
      renderCell: (p: Params) =>
        p.rowNode.type === "group" ? null : (
          <Tooltip title={exchangeByCountry[p.row.country].timeZone}>
            <Typography variant="caption">{formatExchangeTime(p.row.lastTradeAt, p.row.country)}</Typography>
          </Tooltip>
        ),
    },
    {
      field: "bidQty",
      headerName: "Cant. compra",
      width: 96,
      type: "number",
      ...right,
      renderCell: (p: Params) =>
        p.rowNode.type === "group" ? null : p.row.hasPermission ? (
          <Typography variant="caption" sx={{ color: "text.secondary" }}>
            {formatInt(p.row.bidQty, p.row.country)}
          </Typography>
        ) : (
          <MaskedValue row={p.row} />
        ),
    },
    {
      field: "bidPrice",
      headerName: "Compra",
      width: 90,
      type: "number",
      ...right,
      renderCell: (p: Params) => (p.rowNode.type === "group" ? null : <QuoteCell row={p.row} side="bid" />),
    },
    {
      field: "askPrice",
      headerName: "Venta",
      width: 90,
      type: "number",
      ...right,
      renderCell: (p: Params) => (p.rowNode.type === "group" ? null : <QuoteCell row={p.row} side="ask" />),
    },
    {
      field: "askQty",
      headerName: "Cant. venta",
      width: 96,
      type: "number",
      ...right,
      renderCell: (p: Params) =>
        p.rowNode.type === "group" ? null : p.row.hasPermission ? (
          <Typography variant="caption" sx={{ color: "text.secondary" }}>
            {formatInt(p.row.askQty, p.row.country)}
          </Typography>
        ) : (
          <MaskedValue row={p.row} />
        ),
    },
    {
      field: "spread",
      headerName: "Spread",
      width: 76,
      type: "number",
      ...right,
      renderCell: (p: Params) => (p.rowNode.type === "group" ? null : <PriceValue row={p.row} value={p.row.spread} />),
    },
    ...(
      [
        ["volume", "Volumen", 100],
        ["amount", "Monto", 120],
      ] as const
    ).map(
      ([field, headerName, width]): Col => ({
        field,
        headerName,
        width,
        type: "number",
        ...right,
        renderCell: (p: Params) =>
          p.rowNode.type === "group" ? null : p.row.hasPermission ? (
            <Typography variant="caption" sx={{ color: "text.secondary" }}>
              {formatInt(p.row[field], p.row.country)}
            </Typography>
          ) : (
            <MaskedValue row={p.row} />
          ),
      }),
    ),
    {
      field: "referencePrice",
      headerName: "Precio ref.",
      width: 92,
      type: "number",
      ...right,
      renderCell: (p: Params) => (p.rowNode.type === "group" ? null : <PriceValue row={p.row} value={p.row.referencePrice} />),
    },
    {
      field: "positionQty",
      headerName: "Posición",
      width: 84,
      type: "number",
      ...right,
      valueGetter: (_value: unknown, row: WatchlistRow) => row.position?.qty ?? null,
      renderCell: (p: Params) =>
        p.rowNode.type === "group" || p.value == null ? null : (
          <Typography variant="caption">{formatInt(p.value as number, p.row.country)}</Typography>
        ),
    },
    {
      field: "pnl",
      headerName: "P&L",
      description: "Resultado no realizado en tiempo real: (último − precio medio) × cantidad",
      width: 104,
      type: "number",
      ...right,
      valueGetter: (_value: unknown, row: WatchlistRow) =>
        row.position && row.last != null ? (row.last - row.position.avgPrice) * row.position.qty : null,
      renderCell: (p: Params) => {
        if (p.rowNode.type === "group" || p.value == null) return null;
        const value = p.value as number;
        return (
          <FlashValue value={value}>
            <Typography variant="caption" sx={{ color: directionColor(value), fontWeight: 600 }}>
              {formatSigned(value, p.row.country, 0)}
            </Typography>
          </FlashValue>
        );
      },
    },
    ...calcCols,
    {
      field: "actions",
      headerName: "Operar",
      renderHeader: () => <span aria-label="Operar" />,
      width: 116,
      sortable: false,
      filterable: false,
      disableColumnMenu: true,
      renderCell: (p: Params) => (p.rowNode.type === "group" ? null : <RowActions row={p.row} />),
    },
  ];
}

/** Header groups (columnGroupingModel). Calculated columns join their own group. */
export function buildGroupFields(calculated: CalculatedColumn[], treeData: boolean): Record<string, string[]> {
  return {
    instrument: [
      ...(treeData ? [] : ["orderbook"]),
      "alert",
      "events",
      "description",
      "assetClass",
      "status",
      "session",
      "quality",
      "currency",
      "settlement",
    ],
    "trade-info": ["last", "netChange", "changePercent", "intraday", "open", "high", "low", "previousClose", "lastTradeAt"],
    market: ["bidQty", "bidPrice", "askPrice", "askQty", "spread"],
    other: ["volume", "amount", "referencePrice"],
    position: ["positionQty", "pnl"],
    ...(calculated.length > 0 ? { calculated: calculated.map((c) => c.field) } : {}),
  };
}

/**
 * Column-group header with ◀ ▶ buttons. MUI X never makes a group header draggable, so a whole
 * group is moved as a block, swapping places with the adjacent group.
 */
export function GroupHeader({ groupId, groupFields, onMoved }: {
  groupId: string;
  groupFields: Record<string, string[]>;
  onMoved: () => void;
}) {
  const apiRef = useGridApiContext();
  const move = (direction: -1 | 1) => {
    const api = apiRef.current;
    if (!api) return;
    const allFields = api.getAllColumns().map((c) => c.field);
    const positions = Object.keys(groupFields)
      .map((gid) => ({ gid, start: Math.min(...groupFields[gid].map((f) => allFields.indexOf(f)).filter((i) => i >= 0)) }))
      .filter((p) => Number.isFinite(p.start))
      .sort((a, b) => a.start - b.start);
    const currentPos = positions.findIndex((p) => p.gid === groupId);
    const targetPos = currentPos + direction;
    if (currentPos === -1 || targetPos < 0 || targetPos >= positions.length) return;
    const thisFields = groupFields[groupId].filter((f) => allFields.includes(f));
    const otherFields = groupFields[positions[targetPos].gid].filter((f) => allFields.includes(f));
    const blockStart = Math.min(positions[currentPos].start, positions[targetPos].start);
    const newOrder = direction === -1 ? [...thisFields, ...otherFields] : [...otherFields, ...thisFields];
    newOrder.forEach((field, i) => api.setColumnIndex(field, blockStart + i));
    onMoved();
  };
  const label = GROUP_LABELS[groupId];
  return (
    <Stack direction="row" sx={{ alignItems: "center", justifyContent: "center", width: "100%" }}>
      <IconButton
        size="small"
        sx={{ p: 0 }}
        aria-label={`Mover grupo ${label} a la izquierda`}
        onClick={(e) => {
          e.stopPropagation();
          move(-1);
        }}
      >
        <ChevronLeftIcon sx={{ fontSize: 14 }} />
      </IconButton>
      <Typography variant="caption" sx={{ fontWeight: 700, fontSize: 10 }}>
        {label}
      </Typography>
      <IconButton
        size="small"
        sx={{ p: 0 }}
        aria-label={`Mover grupo ${label} a la derecha`}
        onClick={(e) => {
          e.stopPropagation();
          move(1);
        }}
      >
        <ChevronRightIcon sx={{ fontSize: 14 }} />
      </IconButton>
    </Stack>
  );
}

export const GROUP_LABELS: Record<string, string> = {
  instrument: "Instrumento",
  "trade-info": "Información de negociación",
  market: "Mercado",
  other: "Otros",
  position: "Posición",
  calculated: "Calculadas",
};

/**
 * Low-priority columns are hidden automatically as the widget narrows (WL-31, UI-32),
 * on top of whatever the user chose in the columns panel.
 */
const responsivePriority: Record<string, number> = {
  description: 1,
  assetClass: 1,
  settlement: 1,
  referencePrice: 1,
  currency: 2,
  open: 2,
  previousClose: 2,
  amount: 2,
  status: 2,
  bidQty: 3,
  askQty: 3,
  high: 3,
  low: 3,
  spread: 3,
  events: 3,
  lastTradeAt: 3,
  positionQty: 3,
  pnl: 3,
  netChange: 4,
  volume: 4,
  intraday: 4,
  session: 4,
};

export function responsiveHiddenFields(width: number): string[] {
  const level = width >= 1500 ? 0 : width >= 1200 ? 1 : width >= 950 ? 2 : width >= 760 ? 3 : 4;
  return Object.entries(responsivePriority)
    .filter(([, priority]) => priority <= level)
    .map(([field]) => field);
}

const hide = (...fields: string[]) => Object.fromEntries(fields.map((f) => [f, false])) as GridColumnVisibilityModel;

/** Built-in column templates by profile (WL-11). */
export const builtInTemplates: { id: string; name: string; visibility: GridColumnVisibilityModel }[] = [
  { id: "tpl-completa", name: "Completa", visibility: hide("assetClass", "settlement", "positionQty", "pnl") },
  {
    id: "tpl-precio",
    name: "Precio",
    visibility: hide("description", "assetClass", "settlement", "open", "previousClose", "referencePrice", "amount", "positionQty", "pnl", "intraday", "events"),
  },
  {
    id: "tpl-performance",
    name: "Performance",
    visibility: hide("description", "assetClass", "settlement", "bidQty", "askQty", "spread", "referencePrice", "positionQty", "pnl", "currency", "status"),
  },
  {
    id: "tpl-posicion",
    name: "Posición y P&L",
    visibility: hide("description", "assetClass", "settlement", "open", "high", "low", "bidQty", "askQty", "spread", "referencePrice", "amount", "events", "status"),
  },
];

export const DEFAULT_TEMPLATE_ID = "tpl-completa";

export const pinnedLeft = [
  GRID_CHECKBOX_SELECTION_FIELD,
  GRID_REORDER_COL_DEF.field,
  "flag",
  GRID_TREE_DATA_GROUPING_FIELD,
  "orderbook",
];
