"use client";

import { memo, useEffect, useRef, useState, type ReactNode } from "react";
import { Box, Button, Chip, IconButton, Popover, Stack, Tooltip } from "@mui/material";
import FlagIcon from "@mui/icons-material/Flag";
import LockIcon from "@mui/icons-material/Lock";
import NotificationsActiveIcon from "@mui/icons-material/NotificationsActive";
import NotificationsNoneIcon from "@mui/icons-material/NotificationsNone";
import PaidIcon from "@mui/icons-material/Paid";
import AssessmentIcon from "@mui/icons-material/Assessment";
import CampaignIcon from "@mui/icons-material/Campaign";
import ArticleIcon from "@mui/icons-material/Article";
import ArrowDropUpIcon from "@mui/icons-material/ArrowDropUp";
import ArrowDropDownIcon from "@mui/icons-material/ArrowDropDown";
import { SparkLineChart } from "@mui/x-charts/SparkLineChart";
import { Typography } from "@nuam/common-fe-lib-components";
import type { ChipProps } from "@mui/material";
import { formatNumber, formatPercent, formatSigned } from "@/lib/watchlist/format";
import {
  exchangeByCountry,
  type DataQuality,
  type Flag,
  type InstrumentEvent,
  type Session,
  type WatchlistRow,
} from "@/lib/watchlist/model";
import { directionColor, marketColor } from "./tokens";
import { useWatchlistActions } from "./WatchlistContext";

/**
 * Flashes its background when `value` changes (UI-24). The class is toggled directly on the
 * DOM node so a tick never triggers an extra React render; only the updated row re-renders
 * because the feed goes through `apiRef.updateRows` (UI-02).
 */
export function FlashValue({ value, children }: { value: number | null; children: ReactNode }) {
  const ref = useRef<HTMLSpanElement>(null);
  const previous = useRef(value);

  useEffect(() => {
    const el = ref.current;
    const before = previous.current;
    previous.current = value;
    if (!el || before == null || value == null || before === value) return;
    el.classList.remove("wl-flash-up", "wl-flash-down");
    // Force a reflow so the animation restarts on consecutive ticks in the same direction.
    void el.offsetWidth;
    el.classList.add(value > before ? "wl-flash-up" : "wl-flash-down");
  }, [value]);

  return (
    <span
      ref={ref}
      className="wl-flash"
      onAnimationEnd={(e) => e.currentTarget.classList.remove("wl-flash-up", "wl-flash-down")}
    >
      {children}
    </span>
  );
}

/** Masked value for instruments without data entitlement (WL-37): explains why and how to fix it. */
export function MaskedValue({ row }: { row: WatchlistRow }) {
  const { requestAccess } = useWatchlistActions();
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const exchange = exchangeByCountry[row.country].code;
  return (
    <>
      <Tooltip title={`Sin permiso de datos ${exchange}. Clic para solicitar acceso.`}>
        <Box
          component="button"
          type="button"
          aria-label={`Dato enmascarado: sin permiso de datos ${exchange}`}
          onClick={(e) => {
            e.stopPropagation();
            setAnchor(e.currentTarget);
          }}
          sx={{
            all: "unset",
            cursor: "pointer",
            display: "inline-flex",
            alignItems: "center",
            gap: 0.25,
            color: marketColor.masked,
            fontSize: 11,
            letterSpacing: 1,
          }}
        >
          <LockIcon sx={{ fontSize: 11 }} />
          •••
        </Box>
      </Tooltip>
      <Popover
        open={Boolean(anchor)}
        anchorEl={anchor}
        onClose={() => setAnchor(null)}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
        transformOrigin={{ vertical: "top", horizontal: "right" }}
        onClick={(e) => e.stopPropagation()}
      >
        <Box sx={{ p: 1.5, maxWidth: 260 }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
            Dato sin permiso
          </Typography>
          <Typography variant="caption" component="p" sx={{ my: 1 }}>
            Tu perfil no tiene contratado el paquete de datos de {exchange} para {row.orderbook}. Los
            precios se ocultan hasta que el acceso sea aprobado.
          </Typography>
          <Button
            size="small"
            variant="contained"
            onClick={() => {
              requestAccess(row);
              setAnchor(null);
            }}
          >
            Solicitar acceso
          </Button>
        </Box>
      </Popover>
    </>
  );
}

export function PriceValue({ row, value, bold = false, flash = false, color }: {
  row: WatchlistRow;
  value: number | null;
  bold?: boolean;
  flash?: boolean;
  color?: string;
}) {
  if (!row.hasPermission) return <MaskedValue row={row} />;
  const text = (
    <Typography
      variant="caption"
      sx={{ fontWeight: bold ? 700 : 400, color: value == null ? "text.disabled" : (color ?? "text.primary") }}
    >
      {formatNumber(value, row.country, row.decimals)}
    </Typography>
  );
  return flash ? <FlashValue value={value}>{text}</FlashValue> : text;
}

/** Last price with the direction of the latest tick; color always comes with an arrow (WL-15, WL-40). */
export function LastPriceValue({ row }: { row: WatchlistRow }) {
  if (!row.hasPermission) return <MaskedValue row={row} />;
  const arrow =
    row.lastTick > 0 ? (
      <ArrowDropUpIcon aria-label="subió" sx={{ fontSize: 14, color: marketColor.up }} />
    ) : row.lastTick < 0 ? (
      <ArrowDropDownIcon aria-label="bajó" sx={{ fontSize: 14, color: marketColor.down }} />
    ) : null;
  return (
    <FlashValue value={row.last}>
      {arrow}
      <Typography variant="caption" sx={{ fontWeight: 700, color: row.last == null ? "text.disabled" : "text.primary" }}>
        {formatNumber(row.last, row.country, row.decimals)}
      </Typography>
    </FlashValue>
  );
}

export function ChangeValue({ row, percent }: { row: WatchlistRow; percent?: boolean }) {
  if (!row.hasPermission) return <MaskedValue row={row} />;
  const value = percent ? row.changePercent : row.netChange;
  if (value == null) {
    return (
      <Typography variant="caption" sx={{ color: "text.disabled" }}>
        —
      </Typography>
    );
  }
  const color = directionColor(value);
  return (
    <Stack direction="row" sx={{ alignItems: "center", justifyContent: "flex-end", width: "100%" }}>
      {percent && value > 0 && <ArrowDropUpIcon sx={{ fontSize: 16, color }} />}
      {percent && value < 0 && <ArrowDropDownIcon sx={{ fontSize: 16, color }} />}
      <Typography variant="caption" sx={{ color, fontWeight: 600 }}>
        {percent ? formatPercent(value, row.country) : formatSigned(value, row.country, row.decimals)}
      </Typography>
    </Stack>
  );
}

const sessionMeta: Record<Session, { color: ChipProps["color"]; label: string }> = {
  "Pre-apertura": { color: "info", label: "Pre-apertura" },
  Subasta: { color: "warning", label: "Subasta" },
  Continuo: { color: "success", label: "Rueda continua" },
  Cerrado: { color: "default", label: "Cerrado" },
  Suspendido: { color: "error", label: "Suspendido" },
};

/** Session status per instrument with each exchange's own trading hours (WL-16). */
export function SessionBadge({ row }: { row: WatchlistRow }) {
  const { demoState } = useWatchlistActions();
  const session: Session = demoState === "market-closed" && row.session !== "Suspendido" ? "Cerrado" : row.session;
  const exchange = exchangeByCountry[row.country];
  const meta = sessionMeta[session];
  return (
    <Tooltip title={`${exchange.code} · ${meta.label} · Horario ${exchange.hours} (${exchange.timeZone})`}>
      <Chip
        size="small"
        variant="outlined"
        label={session}
        color={meta.color}
        sx={{ height: 16, fontSize: 9, fontWeight: 700, "& .MuiChip-label": { px: 0.75 } }}
      />
    </Tooltip>
  );
}

const qualityMeta: Record<DataQuality, { label: string; color: ChipProps["color"]; help: string }> = {
  realtime: { label: "RT", color: "success", help: "Tiempo real" },
  delayed: { label: "DIF 15'", color: "warning", help: "Dato diferido 15 minutos según el contrato de datos" },
  stale: { label: "DESACT.", color: "error", help: "Desactualizado: se perdió la conexión con el proveedor" },
};

/** Data-quality badge (WL-17): real time, delayed or stale after a connection loss. */
export function QualityBadge({ row }: { row: WatchlistRow }) {
  const { demoState } = useWatchlistActions();
  const quality: DataQuality = demoState === "disconnected" ? "stale" : row.quality;
  if (!row.hasPermission) {
    return (
      <Tooltip title="Sin permiso sobre el dato">
        <Chip size="small" label="SIN PERM." icon={<LockIcon sx={{ fontSize: 10 }} />} sx={{ height: 16, fontSize: 9, fontWeight: 700 }} />
      </Tooltip>
    );
  }
  const meta = qualityMeta[quality];
  return (
    <Tooltip title={meta.help}>
      <Chip
        size="small"
        label={meta.label}
        color={meta.color}
        variant={quality === "realtime" ? "outlined" : "filled"}
        sx={{ height: 16, fontSize: 9, fontWeight: 700, "& .MuiChip-label": { px: 0.75 } }}
      />
    </Tooltip>
  );
}

const eventMeta: Record<InstrumentEvent, { icon: typeof PaidIcon; label: string; detail: string }> = {
  dividend: { icon: PaidIcon, label: "Dividendo", detail: "Dividendo definitivo por anunciar. Fecha límite: 14-10-2026." },
  earnings: { icon: AssessmentIcon, label: "Resultados", detail: "Publicación de resultados trimestrales: 23-10-2026." },
  material: { icon: CampaignIcon, label: "Hecho esencial", detail: "Hecho esencial publicado hoy 08:12 (hora de la bolsa)." },
  news: { icon: ArticleIcon, label: "Noticia relevante", detail: "Noticia relevante del emisor en las últimas 24 h." },
};

/** Corporate-event icons with a tooltip and a detail popover (WL-28, UI-13). */
export function EventIcons({ row }: { row: WatchlistRow }) {
  const [anchor, setAnchor] = useState<{ el: HTMLElement; event: InstrumentEvent } | null>(null);
  if (row.events.length === 0) return null;
  return (
    <>
      <Stack direction="row" spacing={0.25} sx={{ alignItems: "center" }}>
        {row.events.map((event) => {
          const { icon: Icon, label } = eventMeta[event];
          return (
            <Tooltip key={event} title={label}>
              <IconButton
                size="small"
                aria-label={`${label} de ${row.orderbook}`}
                sx={{ p: 0.125 }}
                onClick={(e) => {
                  e.stopPropagation();
                  setAnchor({ el: e.currentTarget, event });
                }}
              >
                <Icon sx={{ fontSize: 13, color: "info.dark" }} />
              </IconButton>
            </Tooltip>
          );
        })}
      </Stack>
      <Popover
        open={Boolean(anchor)}
        anchorEl={anchor?.el}
        onClose={() => setAnchor(null)}
        anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
        onClick={(e) => e.stopPropagation()}
      >
        {anchor && (
          <Box sx={{ p: 1.5, maxWidth: 240 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
              {eventMeta[anchor.event].label} · {row.orderbook}
            </Typography>
            <Typography variant="caption" component="p" sx={{ mt: 0.5 }}>
              {eventMeta[anchor.event].detail}
            </Typography>
          </Box>
        )}
      </Popover>
    </>
  );
}

export function AlertIndicator({ row }: { row: WatchlistRow }) {
  const { openAlert, readOnly } = useWatchlistActions();
  const label =
    row.alert === "triggered" ? "Alerta disparada" : row.alert === "active" ? "Alerta activa" : "Crear alerta de precio";
  return (
    <Tooltip title={label}>
      <span>
        <IconButton
          size="small"
          aria-label={`${label} para ${row.orderbook}`}
          sx={{ p: 0.25 }}
          disabled={readOnly && row.alert === "none"}
          onClick={(e) => {
            e.stopPropagation();
            openAlert(row);
          }}
        >
          {row.alert === "none" ? (
            <NotificationsNoneIcon sx={{ fontSize: 14, color: "action.disabled" }} />
          ) : (
            <NotificationsActiveIcon
              sx={{ fontSize: 14, color: row.alert === "triggered" ? "warning.dark" : "info.dark" }}
            />
          )}
        </IconButton>
      </span>
    </Tooltip>
  );
}

export const flagColor: Record<Flag, string> = {
  none: "action.disabled",
  green: "success.dark",
  yellow: "warning.main",
  red: "error.dark",
  blue: "info.dark",
};

export const flagLabel: Record<Flag, string> = {
  none: "Sin marca",
  green: "Verde",
  yellow: "Amarilla",
  red: "Roja",
  blue: "Azul",
};

export function FlagButton({ row }: { row: WatchlistRow }) {
  const { cycleFlag } = useWatchlistActions();
  return (
    <Tooltip title={`Marca: ${flagLabel[row.flag]} (clic para cambiar)`}>
      <IconButton
        size="small"
        aria-label={`Marca ${flagLabel[row.flag]} de ${row.orderbook}. Cambiar marca`}
        sx={{ p: 0.25 }}
        onClick={(e) => {
          e.stopPropagation();
          cycleFlag(row.id);
        }}
      >
        <FlagIcon sx={{ fontSize: 15, color: flagColor[row.flag] }} />
      </IconButton>
    </Tooltip>
  );
}

const sparkColor = {
  up: (mode: "light" | "dark") => (mode === "dark" ? "#5FE0B4" : "#0A7A52"),
  down: (mode: "light" | "dark") => (mode === "dark" ? "#FF8A80" : "#C62828"),
};

/** Intraday sparkline (WL-18). Memoized on the data array identity, which only changes on a tick. */
export const SparklineCell = memo(function SparklineCell({ data, hasPermission }: { data: number[]; hasPermission: boolean }) {
  if (!hasPermission || data.length < 2) return null;
  const up = data[data.length - 1] >= data[0];
  return (
    <Box sx={{ width: "100%", height: 18 }} aria-hidden>
      <SparkLineChart
        data={data}
        height={18}
        curve="linear"
        color={up ? sparkColor.up : sparkColor.down}
        margin={1}
        disableClipping
      />
    </Box>
  );
});
