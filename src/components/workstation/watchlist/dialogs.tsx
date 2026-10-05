"use client";

import { useMemo, useRef, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  Drawer,
  FormControl,
  IconButton,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  Tab,
  Tabs,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from "@mui/material";
import DeleteIcon from "@mui/icons-material/DeleteOutlined";
import UploadFileIcon from "@mui/icons-material/UploadFile";
import { FORMULA_FIELDS, evaluateFormula, parseFormula } from "@/lib/watchlist/formula";
import { formatNumber } from "@/lib/watchlist/format";
import {
  exchangeByCountry,
  type ConditionalRule,
  type Instrument,
  type RuleField,
  type RuleOp,
  type RuleStyle,
  type WatchlistRow,
} from "@/lib/watchlist/model";
import type { TicketSide } from "./WatchlistContext";

export function ConfirmDialog({ open, title, message, confirmLabel, onConfirm, onClose }: {
  open: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  onConfirm: () => void;
  onClose: () => void;
}) {
  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle sx={{ fontSize: 16 }}>{title}</DialogTitle>
      <DialogContent>
        <Typography variant="body2">{message}</Typography>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancelar</Button>
        <Button
          color="error"
          variant="contained"
          onClick={() => {
            onConfirm();
            onClose();
          }}
        >
          {confirmLabel}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export function PromptDialog({ open, title, label, initialValue, confirmLabel = "Guardar", onSubmit, onClose }: {
  open: boolean;
  title: string;
  label: string;
  initialValue?: string;
  confirmLabel?: string;
  onSubmit: (value: string) => void;
  onClose: () => void;
}) {
  const [value, setValue] = useState(initialValue ?? "");
  const trimmed = value.trim();
  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle sx={{ fontSize: 16 }}>{title}</DialogTitle>
      <DialogContent>
        <TextField
          autoFocus
          fullWidth
          size="small"
          margin="dense"
          label={label}
          value={value}
          slotProps={{ htmlInput: { maxLength: 40 } }}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && trimmed) {
              onSubmit(trimmed);
              onClose();
            }
          }}
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancelar</Button>
        <Button
          variant="contained"
          disabled={!trimmed}
          onClick={() => {
            onSubmit(trimmed);
            onClose();
          }}
        >
          {confirmLabel}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export interface OrderResult {
  severity: "success" | "error" | "warning";
  message: string;
}

/** Risk limit per order in local currency used by the mocked pre-trade risk check. */
const RISK_LIMIT = 50_000_000;

/** Order ticket prefilled from the clicked side (WL-20/21). Feedback stays in context (WL-39). */
export function OrderTicketDialog({ ticket, onClose, onResult }: {
  ticket: { row: WatchlistRow; side: TicketSide };
  onClose: () => void;
  onResult: (result: OrderResult) => void;
}) {
  const { row } = ticket;
  const [side, setSide] = useState<TicketSide>(ticket.side);
  const [qty, setQty] = useState("100");
  // Ask for buys, bid for sells (WL-20).
  const [price, setPrice] = useState(() => {
    const prefill = ticket.side === "buy" ? (row.askPrice ?? row.last) : (row.bidPrice ?? row.last);
    return prefill == null ? "" : prefill.toFixed(row.decimals);
  });
  const [type, setType] = useState<"LIMIT" | "MARKET">("LIMIT");
  const [sending, setSending] = useState(false);
  const [rejection, setRejection] = useState<string | null>(null);

  const qtyNum = Number(qty);
  const priceNum = Number(price);
  const valid = Number.isInteger(qtyNum) && qtyNum > 0 && (type === "MARKET" || priceNum > 0);
  const notional = qtyNum * (type === "MARKET" ? (row.last ?? 0) : priceNum);
  const blocked = !row.hasPermission || row.status !== "ENABLED";

  const submit = () => {
    setSending(true);
    setRejection(null);
    window.setTimeout(() => {
      setSending(false);
      if (notional > RISK_LIMIT) {
        // Rejections keep the ticket open so the user can fix the order without losing context.
        setRejection(
          `Rechazada por control de riesgo: el monto (${formatNumber(notional, row.country, 0)} ${row.currency}) excede el límite por orden de ${formatNumber(RISK_LIMIT, row.country, 0)}.`,
        );
        onResult({ severity: "error", message: `Orden rechazada por control de riesgo: ${row.orderbook}` });
        return;
      }
      if (Math.random() < 0.12) {
        setRejection("Error de comunicación con el motor de órdenes (503). La orden no fue enviada; reintenta.");
        onResult({ severity: "warning", message: `Error al enviar la orden de ${row.orderbook}` });
        return;
      }
      const id = `ORD-${Math.floor(100000 + Math.random() * 900000)}`;
      onResult({
        severity: "success",
        message: `${side === "buy" ? "Compra" : "Venta"} ${qtyNum} ${row.orderbook} @ ${
          type === "MARKET" ? "mercado" : formatNumber(priceNum, row.country, row.decimals)
        } enviada (${id})`,
      });
      onClose();
    }, 600);
  };

  return (
    <Dialog open onClose={sending ? undefined : onClose} maxWidth="xs" fullWidth>
      <DialogTitle sx={{ fontSize: 16, pb: 1 }}>
        Ticket de orden · {row.orderbook}
        <Typography variant="caption" component="div" sx={{ color: "text.secondary" }}>
          {row.description} · {exchangeByCountry[row.country].code} · {row.currency}
        </Typography>
      </DialogTitle>
      <DialogContent>
        <Stack spacing={1.5} sx={{ pt: 1 }}>
          <ToggleButtonGroup
            exclusive
            fullWidth
            size="small"
            value={side}
            onChange={(_, value: TicketSide | null) => value && setSide(value)}
            aria-label="Lado de la orden"
          >
            <ToggleButton value="buy" sx={{ "&.Mui-selected": { color: "success.dark", fontWeight: 700 } }}>
              Compra
            </ToggleButton>
            <ToggleButton value="sell" sx={{ "&.Mui-selected": { color: "error.dark", fontWeight: 700 } }}>
              Venta
            </ToggleButton>
          </ToggleButtonGroup>
          <Stack direction="row" spacing={1}>
            <FormControl size="small" sx={{ minWidth: 120 }}>
              <InputLabel id="ticket-type">Tipo</InputLabel>
              <Select labelId="ticket-type" label="Tipo" value={type} onChange={(e) => setType(e.target.value as "LIMIT" | "MARKET")}>
                <MenuItem value="LIMIT">Límite</MenuItem>
                <MenuItem value="MARKET">Mercado</MenuItem>
              </Select>
            </FormControl>
            <TextField
              size="small"
              label="Cantidad"
              value={qty}
              onChange={(e) => setQty(e.target.value.replace(/[^\d]/g, ""))}
              slotProps={{ htmlInput: { inputMode: "numeric" } }}
              fullWidth
            />
          </Stack>
          <TextField
            size="small"
            label={`Precio (${row.currency})`}
            value={type === "MARKET" ? "" : price}
            disabled={type === "MARKET"}
            placeholder={type === "MARKET" ? "A mercado" : undefined}
            onChange={(e) => setPrice(e.target.value.replace(/[^\d.]/g, ""))}
            slotProps={{ htmlInput: { inputMode: "decimal" } }}
          />
          <Typography variant="caption" sx={{ color: "text.secondary" }}>
            Compra {formatNumber(row.bidPrice, row.country, row.decimals)} · Venta{" "}
            {formatNumber(row.askPrice, row.country, row.decimals)} · Monto estimado{" "}
            {Number.isFinite(notional) ? formatNumber(notional, row.country, 0) : "—"} {row.currency}
          </Typography>
          {blocked && <Alert severity="warning">Instrumento no operable: sin permiso o suspendido.</Alert>}
          {rejection && <Alert severity="error">{rejection}</Alert>}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={sending}>
          Cancelar
        </Button>
        <Button
          variant="contained"
          color={side === "buy" ? "success" : "error"}
          disabled={!valid || sending || blocked}
          onClick={submit}
          startIcon={sending ? <CircularProgress size={14} color="inherit" /> : undefined}
        >
          {side === "buy" ? "Enviar compra" : "Enviar venta"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

/** Price alert form opened from a row (WL-26) plus the list-level alert (WL-29). */
export function AlertDialog({ target, existing, listAlertThreshold, listName, onSave, onDelete, onSaveListAlert, onClose }: {
  target: WatchlistRow | "list";
  existing?: { op: ">=" | "<="; price: number; status: "active" | "triggered" };
  listAlertThreshold: number | null;
  listName: string;
  onSave: (op: ">=" | "<=", price: number) => void;
  onDelete: () => void;
  onSaveListAlert: (threshold: number | null) => void;
  onClose: () => void;
}) {
  const [op, setOp] = useState<">=" | "<=">(existing?.op ?? ">=");
  const [price, setPrice] = useState(() => {
    if (target === "list") return "";
    const base = existing?.price ?? (target.last == null ? null : target.last * 1.01);
    return base == null ? "" : base.toFixed(target.decimals);
  });
  const [threshold, setThreshold] = useState(String(listAlertThreshold ?? 3));

  if (target === "list") {
    const value = Number(threshold);
    return (
      <Dialog open onClose={onClose} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontSize: 16 }}>Alerta de lista · {listName}</DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ mb: 1.5 }}>
            Avisar cuando cualquier instrumento de la lista varíe más que el umbral (en valor absoluto).
          </Typography>
          <TextField
            size="small"
            label="Umbral de variación %"
            value={threshold}
            onChange={(e) => setThreshold(e.target.value.replace(/[^\d.]/g, ""))}
            fullWidth
          />
        </DialogContent>
        <DialogActions>
          {listAlertThreshold != null && (
            <Button
              color="error"
              onClick={() => {
                onSaveListAlert(null);
                onClose();
              }}
            >
              Eliminar alerta
            </Button>
          )}
          <Box sx={{ flex: 1 }} />
          <Button onClick={onClose}>Cancelar</Button>
          <Button
            variant="contained"
            disabled={!(value > 0)}
            onClick={() => {
              onSaveListAlert(value);
              onClose();
            }}
          >
            Guardar
          </Button>
        </DialogActions>
      </Dialog>
    );
  }

  const priceNum = Number(price);
  return (
    <Dialog open onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle sx={{ fontSize: 16 }}>
        Alerta de precio · {target.orderbook}
        {existing?.status === "triggered" && <Chip size="small" color="warning" label="Disparada" sx={{ ml: 1 }} />}
      </DialogTitle>
      <DialogContent>
        <Typography variant="caption" component="p" sx={{ mb: 1.5, color: "text.secondary" }}>
          Último: {formatNumber(target.last, target.country, target.decimals)} {target.currency}
        </Typography>
        <Stack direction="row" spacing={1}>
          <FormControl size="small" sx={{ minWidth: 140 }}>
            <InputLabel id="alert-op">Condición</InputLabel>
            <Select labelId="alert-op" label="Condición" value={op} onChange={(e) => setOp(e.target.value as ">=" | "<=")}>
              <MenuItem value=">=">Precio ≥</MenuItem>
              <MenuItem value="<=">Precio ≤</MenuItem>
            </Select>
          </FormControl>
          <TextField
            size="small"
            label={`Precio (${target.currency})`}
            value={price}
            onChange={(e) => setPrice(e.target.value.replace(/[^\d.]/g, ""))}
            fullWidth
          />
        </Stack>
      </DialogContent>
      <DialogActions>
        {existing && (
          <Button
            color="error"
            onClick={() => {
              onDelete();
              onClose();
            }}
          >
            Eliminar
          </Button>
        )}
        <Box sx={{ flex: 1 }} />
        <Button onClick={onClose}>Cancelar</Button>
        <Button
          variant="contained"
          disabled={!(priceNum > 0)}
          onClick={() => {
            onSave(op, priceNum);
            onClose();
          }}
        >
          {existing ? "Reactivar" : "Crear alerta"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

const ruleFieldLabel: Record<RuleField, string> = {
  changePercent: "Var. %",
  netChange: "Var.",
  last: "Último",
  volume: "Volumen",
  spread: "Spread",
};
const ruleStyleLabel: Record<RuleStyle, string> = {
  up: "Fondo alza",
  down: "Fondo baja",
  warn: "Fondo advertencia",
  info: "Fondo informativo",
};
// The drawer renders in a portal outside the watchlist root, so the --wl-* tokens are not in scope.
const ruleSwatch: Record<RuleStyle, string> = {
  up: "rgba(10, 122, 82, 0.35)",
  down: "rgba(198, 40, 40, 0.32)",
  warn: "rgba(237, 108, 2, 0.32)",
  info: "rgba(2, 136, 209, 0.28)",
};

/** Conditional formatting rules editor in a side panel (WL-19, UI-09, UI-23). */
export function RulesDrawer({ open, rules, onChange, onClose }: {
  open: boolean;
  rules: ConditionalRule[];
  onChange: (rules: ConditionalRule[]) => void;
  onClose: () => void;
}) {
  const [field, setField] = useState<RuleField>("changePercent");
  const [op, setOp] = useState<RuleOp>(">=");
  const [value, setValue] = useState("2");
  const [style, setStyle] = useState<RuleStyle>("up");
  const valueNum = Number(value);

  return (
    <Drawer anchor="right" open={open} onClose={onClose} slotProps={{ paper: { sx: { width: 340, p: 2 } } }}>
      <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
        Formato condicional
      </Typography>
      <Typography variant="caption" sx={{ color: "text.secondary" }}>
        Las reglas se evalúan en orden y se aplica la primera que coincide en cada celda. El color
        siempre acompaña al signo o la flecha del valor.
      </Typography>
      <Stack spacing={1} sx={{ my: 2 }}>
        {rules.length === 0 && (
          <Typography variant="body2" sx={{ color: "text.secondary" }}>
            Sin reglas.
          </Typography>
        )}
        {rules.map((rule) => (
          <Stack key={rule.id} direction="row" sx={{ alignItems: "center", gap: 1 }}>
            <Box sx={{ width: 14, height: 14, borderRadius: 0.5, border: 1, borderColor: "divider", bgcolor: ruleSwatch[rule.style] }} />
            <Typography variant="body2" sx={{ flex: 1 }}>
              {ruleFieldLabel[rule.field]} {rule.op} {rule.value} → {ruleStyleLabel[rule.style]}
            </Typography>
            <IconButton
              size="small"
              aria-label="Eliminar regla"
              onClick={() => onChange(rules.filter((r) => r.id !== rule.id))}
            >
              <DeleteIcon fontSize="small" />
            </IconButton>
          </Stack>
        ))}
      </Stack>
      <Divider />
      <Typography variant="subtitle2" sx={{ mt: 2, mb: 1 }}>
        Nueva regla
      </Typography>
      <Stack spacing={1.25}>
        <Stack direction="row" spacing={1}>
          <FormControl size="small" fullWidth>
            <InputLabel id="rule-field">Campo</InputLabel>
            <Select labelId="rule-field" label="Campo" value={field} onChange={(e) => setField(e.target.value as RuleField)}>
              {(Object.keys(ruleFieldLabel) as RuleField[]).map((f) => (
                <MenuItem key={f} value={f}>
                  {ruleFieldLabel[f]}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <FormControl size="small" sx={{ minWidth: 80 }}>
            <InputLabel id="rule-op">Op.</InputLabel>
            <Select labelId="rule-op" label="Op." value={op} onChange={(e) => setOp(e.target.value as RuleOp)}>
              {([">", ">=", "<", "<="] as RuleOp[]).map((o) => (
                <MenuItem key={o} value={o}>
                  {o}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Stack>
        <TextField
          size="small"
          label="Valor"
          value={value}
          onChange={(e) => setValue(e.target.value.replace(/[^\d.-]/g, ""))}
        />
        <FormControl size="small">
          <InputLabel id="rule-style">Estilo</InputLabel>
          <Select labelId="rule-style" label="Estilo" value={style} onChange={(e) => setStyle(e.target.value as RuleStyle)}>
            {(Object.keys(ruleStyleLabel) as RuleStyle[]).map((s) => (
              <MenuItem key={s} value={s}>
                {ruleStyleLabel[s]}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        <Button
          variant="contained"
          disabled={value === "" || Number.isNaN(valueNum)}
          onClick={() =>
            onChange([...rules, { id: `rule-${Date.now()}`, field, op, value: valueNum, style }])
          }
        >
          Agregar regla
        </Button>
      </Stack>
    </Drawer>
  );
}

/**
 * Formula editor for calculated columns and synthetic instruments (WL-13, UI-21).
 * Validates while typing and previews the result on a sample row.
 */
export function FormulaDialog({ mode, sample, resolve, onSubmit, onClose }: {
  mode: "column" | "synthetic";
  sample: Instrument | null;
  resolve: (orderbook: string) => Instrument | undefined;
  onSubmit: (name: string, expression: string) => void;
  onClose: () => void;
}) {
  const [name, setName] = useState(mode === "column" ? "Spread %" : "Spread ECOPETROL-ISA");
  const [expression, setExpression] = useState(
    mode === "column" ? "(askPrice - bidPrice) / last * 100" : "[ECOPETROL].last - [ISA].last",
  );
  const inputRef = useRef<HTMLInputElement>(null);

  const parsed = useMemo(() => parseFormula(expression), [expression]);
  const unknownRefs = parsed.ok ? parsed.references.filter((r) => !resolve(r)) : [];
  const preview =
    parsed.ok && unknownRefs.length === 0 ? evaluateFormula(parsed.ast, sample ?? {}, resolve) : null;
  const needsRefs = mode === "synthetic" && parsed.ok && parsed.references.length === 0;
  const error = !parsed.ok
    ? parsed.error
    : unknownRefs.length > 0
      ? `Instrumento no encontrado: ${unknownRefs.join(", ")}`
      : needsRefs
        ? "Un instrumento sintético debe referenciar al menos un instrumento, p. ej. [ENKA].last"
        : null;

  const insert = (text: string) => {
    const el = inputRef.current;
    const start = el?.selectionStart ?? expression.length;
    const end = el?.selectionEnd ?? expression.length;
    setExpression(expression.slice(0, start) + text + expression.slice(end));
    window.requestAnimationFrame(() => el?.focus());
  };

  return (
    <Dialog open onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ fontSize: 16 }}>
        {mode === "column" ? "Nueva columna calculada" : "Nuevo instrumento sintético"}
      </DialogTitle>
      <DialogContent>
        <Stack spacing={1.5} sx={{ pt: 1 }}>
          <TextField
            size="small"
            label="Nombre"
            value={name}
            onChange={(e) => setName(e.target.value)}
            slotProps={{ htmlInput: { maxLength: 30 } }}
          />
          <TextField
            size="small"
            label="Fórmula"
            value={expression}
            inputRef={inputRef}
            onChange={(e) => setExpression(e.target.value)}
            error={Boolean(error)}
            helperText={
              error ??
              `Resultado ${sample && mode === "column" ? `para ${sample.orderbook}` : "actual"}: ${
                preview == null ? "sin dato" : preview.toLocaleString("es-CL", { maximumFractionDigits: 4 })
              }`
            }
            slotProps={{ htmlInput: { spellCheck: false, style: { fontFamily: "monospace" } } }}
          />
          <Box>
            <Typography variant="caption" sx={{ color: "text.secondary" }}>
              Campos (clic para insertar). Operadores + − × ÷, paréntesis, abs(), min(), max().
              Otro instrumento: [NEMO].campo
            </Typography>
            <Stack direction="row" sx={{ flexWrap: "wrap", gap: 0.5, mt: 0.5 }}>
              {FORMULA_FIELDS.map((f) => (
                <Chip key={f} size="small" label={f} onClick={() => insert(f)} sx={{ fontFamily: "monospace", fontSize: 11 }} />
              ))}
            </Stack>
          </Box>
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancelar</Button>
        <Button
          variant="contained"
          disabled={Boolean(error) || !name.trim()}
          onClick={() => {
            onSubmit(name.trim(), expression.trim());
            onClose();
          }}
        >
          Crear
        </Button>
      </DialogActions>
    </Dialog>
  );
}

/** Splits pasted or uploaded text into candidate tickers (one per line, comma, semicolon or tab). */
export function parseTickers(text: string) {
  return Array.from(
    new Set(
      text
        .split(/[\n\r,;\t]+/)
        .map((t) => t.trim().replace(/^"|"$/g, "").toUpperCase())
        .filter((t) => t && t !== "NEMOTECNICO" && t !== "NEMOTÉCNICO" && t !== "ORDERBOOK"),
    ),
  );
}

/** Import from a CSV/TXT file or pasted tickers (WL-06, UI-20). */
export function ImportDialog({ onImport, onClose }: {
  onImport: (tickers: string[]) => void;
  onClose: () => void;
}) {
  const [tab, setTab] = useState<"paste" | "file">("paste");
  const [text, setText] = useState("");
  const [fileName, setFileName] = useState<string | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);

  const tickers = parseTickers(text);

  const readFile = (file: File) => {
    setFileError(null);
    if (!/\.(csv|txt)$/i.test(file.name)) {
      setFileError("Formato no soportado. Usa .csv o .txt (desde Excel: Guardar como CSV).");
      return;
    }
    if (file.size > 512 * 1024) {
      setFileError("El archivo supera 512 KB.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      // Only the first column of each line is taken as the ticker.
      const content = String(reader.result ?? "")
        .split(/\r?\n/)
        .map((line) => line.split(/[;,\t]/)[0])
        .join("\n");
      setText(content);
      setFileName(file.name);
    };
    reader.onerror = () => setFileError("No se pudo leer el archivo.");
    reader.readAsText(file);
  };

  return (
    <Dialog open onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle sx={{ fontSize: 16 }}>Importar instrumentos</DialogTitle>
      <DialogContent>
        <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 1.5 }}>
          <Tab value="paste" label="Pegar nemotécnicos" />
          <Tab value="file" label="Archivo CSV" />
        </Tabs>
        {tab === "paste" ? (
          <TextField
            autoFocus
            multiline
            minRows={5}
            fullWidth
            size="small"
            placeholder={"ECOPETROL\nISA\nBAP, BVN"}
            value={text}
            onChange={(e) => setText(e.target.value)}
            helperText="Uno por línea o separados por coma, punto y coma o tabulación. También puedes pegar con Ctrl+V sobre la grilla."
          />
        ) : (
          <Stack spacing={1}>
            <Button component="label" variant="outlined" startIcon={<UploadFileIcon />}>
              Seleccionar archivo
              <input
                hidden
                type="file"
                accept=".csv,.txt,text/csv,text/plain"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) readFile(file);
                  e.target.value = "";
                }}
              />
            </Button>
            <Typography variant="caption" sx={{ color: "text.secondary" }}>
              Se toma la primera columna de cada fila como nemotécnico.
            </Typography>
            {fileName && <Alert severity="info">{fileName}: {tickers.length} nemotécnicos detectados.</Alert>}
            {fileError && <Alert severity="error">{fileError}</Alert>}
          </Stack>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancelar</Button>
        <Button
          variant="contained"
          disabled={tickers.length === 0}
          onClick={() => {
            onImport(tickers);
            onClose();
          }}
        >
          Importar {tickers.length > 0 ? `(${tickers.length})` : ""}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
