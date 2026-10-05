"use client";

import { useRef, useState, type PointerEvent } from "react";
import { Box, ButtonBase, Stack } from "@mui/material";
import { Typography } from "@nuam/common-fe-lib-components";
import { formatNumber } from "@/lib/watchlist/format";
import type { WatchlistRow } from "@/lib/watchlist/model";
import { ChangeValue, EventIcons, FlagButton, LastPriceValue, QualityBadge, SessionBadge, SparklineCell } from "./cells";
import { marketColor } from "./tokens";
import { useWatchlistActions } from "./WatchlistContext";

const SWIPE_THRESHOLD = 64;
const MAX_SWIPE = 96;
const LONG_PRESS_MS = 550;
const MOVE_TOLERANCE = 8;

/**
 * Card used by the list/mobile view (WL-32, WL-35). Same row model as the table.
 * Gestures (UI-22): swipe right → buy, swipe left → sell, long press → context menu.
 */
export function WatchlistCard({ row }: { row: WatchlistRow }) {
  const { openTicket, openContextMenu } = useWatchlistActions();
  const [dx, setDx] = useState(0);
  // Latest offset for pointerup: a fast swipe ends before the state update re-renders.
  const dxRef = useRef(0);
  const moveTo = (value: number) => {
    dxRef.current = value;
    setDx(value);
  };
  const gesture = useRef<{ x: number; y: number; id: number; horizontal: boolean | null } | null>(null);
  const longPress = useRef<number | null>(null);

  const clearLongPress = () => {
    if (longPress.current != null) window.clearTimeout(longPress.current);
    longPress.current = null;
  };

  const onPointerDown = (e: PointerEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement).closest("button")) return;
    gesture.current = { x: e.clientX, y: e.clientY, id: e.pointerId, horizontal: null };
    const { clientX, clientY } = e;
    longPress.current = window.setTimeout(() => {
      gesture.current = null;
      moveTo(0);
      openContextMenu(row, clientX, clientY);
    }, LONG_PRESS_MS);
  };

  const onPointerMove = (e: PointerEvent<HTMLDivElement>) => {
    const g = gesture.current;
    if (!g || g.id !== e.pointerId) return;
    const deltaX = e.clientX - g.x;
    const deltaY = e.clientY - g.y;
    if (Math.abs(deltaX) > MOVE_TOLERANCE || Math.abs(deltaY) > MOVE_TOLERANCE) clearLongPress();
    if (g.horizontal == null && (Math.abs(deltaX) > MOVE_TOLERANCE || Math.abs(deltaY) > MOVE_TOLERANCE)) {
      g.horizontal = Math.abs(deltaX) > Math.abs(deltaY);
      if (g.horizontal) {
        try {
          e.currentTarget.setPointerCapture(e.pointerId);
        } catch {
          // The pointer was already released; the swipe still completes on pointerup.
        }
      }
    }
    if (g.horizontal) moveTo(Math.max(-MAX_SWIPE, Math.min(MAX_SWIPE, deltaX)));
  };

  const onPointerEnd = () => {
    clearLongPress();
    const offset = dxRef.current;
    if (gesture.current?.horizontal && row.hasPermission) {
      if (offset >= SWIPE_THRESHOLD) openTicket(row, "buy");
      else if (offset <= -SWIPE_THRESHOLD) openTicket(row, "sell");
    }
    gesture.current = null;
    moveTo(0);
  };

  return (
    // Grid cells inherit line-height = row height; reset it so inline text keeps its own size.
    <Box sx={{ position: "relative", width: "100%", height: "100%", overflow: "hidden", lineHeight: 1.4 }}>
      {/* Actions revealed behind the card while swiping. */}
      <Stack
        direction="row"
        aria-hidden
        sx={{ position: "absolute", inset: 0, justifyContent: "space-between", alignItems: "center", px: 2 }}
      >
        <Typography variant="caption" sx={{ fontWeight: 700, color: marketColor.up, opacity: dx > 0 ? 1 : 0 }}>
          COMPRAR ▶
        </Typography>
        <Typography variant="caption" sx={{ fontWeight: 700, color: marketColor.down, opacity: dx < 0 ? 1 : 0 }}>
          ◀ VENDER
        </Typography>
      </Stack>
      <Box
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerEnd}
        onPointerCancel={onPointerEnd}
        onContextMenu={(e) => {
          e.preventDefault();
          openContextMenu(row, e.clientX, e.clientY);
        }}
        sx={{
          position: "relative",
          height: "100%",
          px: 1,
          py: 0.5,
          bgcolor: "background.paper",
          borderBottom: 1,
          borderColor: "divider",
          transform: `translateX(${dx}px)`,
          transition: dx === 0 ? "transform 160ms ease-out" : "none",
          touchAction: "pan-y",
          userSelect: "none",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          gap: 0.25,
        }}
      >
        <Stack direction="row" spacing={0.75} sx={{ alignItems: "center" }}>
          <FlagButton row={row} />
          <Typography variant="body2" sx={{ fontWeight: 700 }}>
            {row.orderbook}
          </Typography>
          <QualityBadge row={row} />
          <SessionBadge row={row} />
          <EventIcons row={row} />
          <Box sx={{ flex: 1 }} />
          <Box sx={{ minWidth: 90, display: "flex", justifyContent: "flex-end" }}>
            <LastPriceValue row={row} />
          </Box>
        </Stack>
        <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
          <Typography variant="caption" noWrap sx={{ color: "text.secondary", flex: 1, minWidth: 0 }}>
            {row.description}
          </Typography>
          <Box sx={{ width: 64, height: 18, flexShrink: 0 }}>
            <SparklineCell data={row.intraday} hasPermission={row.hasPermission} />
          </Box>
          <Box sx={{ minWidth: 70 }}>
            <ChangeValue row={row} percent />
          </Box>
        </Stack>
        <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
          <ButtonBase
            disabled={!row.hasPermission || row.bidPrice == null}
            onClick={() => openTicket(row, "sell")}
            aria-label={`Vender ${row.orderbook} a ${formatNumber(row.bidPrice, row.country, row.decimals)}`}
            sx={{ fontSize: 11, color: marketColor.up, fontWeight: 600, px: 0.5, borderRadius: 0.5 }}
          >
            Compra {row.hasPermission ? formatNumber(row.bidPrice, row.country, row.decimals) : "•••"}
          </ButtonBase>
          <ButtonBase
            disabled={!row.hasPermission || row.askPrice == null}
            onClick={() => openTicket(row, "buy")}
            aria-label={`Comprar ${row.orderbook} a ${formatNumber(row.askPrice, row.country, row.decimals)}`}
            sx={{ fontSize: 11, color: marketColor.down, fontWeight: 600, px: 0.5, borderRadius: 0.5 }}
          >
            Venta {row.hasPermission ? formatNumber(row.askPrice, row.country, row.decimals) : "•••"}
          </ButtonBase>
          <Box sx={{ flex: 1 }} />
          <Typography variant="caption" sx={{ color: "text.secondary" }}>
            {row.currency}
          </Typography>
        </Stack>
      </Box>
    </Box>
  );
}
