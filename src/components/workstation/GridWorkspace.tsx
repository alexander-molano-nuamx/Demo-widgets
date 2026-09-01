"use client";

import "react-grid-layout/css/styles.css";
import "react-resizable/css/styles.css";

import { useCallback, useMemo, useRef, useState, type ReactNode } from "react";
import GridLayout, { WidthProvider, type Layout } from "react-grid-layout/legacy";
import { Box, Chip, Stack } from "@mui/material";
import RestoreIcon from "@mui/icons-material/SettingsBackupRestore";
import { Typography } from "@nuam/common-fe-lib-components";
import { WatchlistPanel } from "./WatchlistPanel";
import { ChartPanel } from "./panels/ChartPanel";
import { MarketDepthPanel } from "./panels/MarketDepthPanel";
import { RankingsPanel } from "./panels/RankingsPanel";
import type { PanelWindowControls } from "./panels/PanelWindow";

const ReactGridLayout = WidthProvider(GridLayout);

const ROW_HEIGHT = 26;
const COLLAPSED_H = 2;

interface WidgetDef {
  id: string;
  title: string;
  minW: number;
  minH: number;
  render: (controls: Required<PanelWindowControls> & { dragHandleClassName: string }) => ReactNode;
}

const widgetDefs: WidgetDef[] = [
  {
    id: "watchlist",
    title: "Watchlist",
    minW: 4,
    minH: 6,
    render: (controls) => <WatchlistPanel {...controls} />,
  },
  {
    id: "chart",
    title: "Chart",
    minW: 4,
    minH: 8,
    render: (controls) => <ChartPanel {...controls} />,
  },
  {
    id: "marketDepth",
    title: "Market depth",
    minW: 3,
    minH: 8,
    render: (controls) => <MarketDepthPanel {...controls} />,
  },
  {
    id: "rankings",
    title: "Rankings",
    minW: 2,
    minH: 8,
    render: (controls) => <RankingsPanel {...controls} />,
  },
];

const defaultLayout: Layout[] = [
  { i: "watchlist", x: 0, y: 0, w: 12, h: 13, minW: 4, minH: 6 },
  { i: "chart", x: 0, y: 13, w: 6, h: 16, minW: 4, minH: 8 },
  { i: "marketDepth", x: 6, y: 13, w: 4, h: 16, minW: 3, minH: 8 },
  { i: "rankings", x: 10, y: 13, w: 2, h: 16, minW: 2, minH: 8 },
];

export function GridWorkspace() {
  const [layout, setLayout] = useState<Layout[]>(defaultLayout);
  const [minimizedIds, setMinimizedIds] = useState<Set<string>>(new Set());
  const [maximizedId, setMaximizedId] = useState<string | null>(null);
  const [closedIds, setClosedIds] = useState<Set<string>>(new Set());
  const restoreHeights = useRef<Map<string, number>>(new Map());

  const handleLayoutChange = useCallback((newLayout: Layout[]) => {
    setLayout((prev) =>
      newLayout.map((item) => {
        const prevItem = prev.find((p) => p.i === item.i);
        return prevItem ? { ...item, minW: prevItem.minW, minH: prevItem.minH } : item;
      }),
    );
  }, []);

  const toggleMinimize = useCallback((id: string) => {
    setMinimizedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
    setLayout((prev) =>
      prev.map((item) => {
        if (item.i !== id) return item;
        const isCurrentlyMinimized = minimizedIds.has(id);
        if (isCurrentlyMinimized) {
          const restored = restoreHeights.current.get(id) ?? item.minH ?? 8;
          return { ...item, h: restored };
        }
        restoreHeights.current.set(id, item.h);
        return { ...item, h: COLLAPSED_H };
      }),
    );
  }, [minimizedIds]);

  const toggleMaximize = useCallback((id: string) => {
    setMaximizedId((prev) => (prev === id ? null : id));
  }, []);

  const closeWidget = useCallback((id: string) => {
    setClosedIds((prev) => new Set(prev).add(id));
    setMaximizedId((prev) => (prev === id ? null : prev));
  }, []);

  const reopenWidget = useCallback((id: string) => {
    setClosedIds((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
    setLayout((prev) => {
      if (prev.some((item) => item.i === id)) return prev;
      const def = widgetDefs.find((w) => w.id === id);
      const fallback = defaultLayout.find((item) => item.i === id)!;
      const maxY = prev.reduce((max, item) => Math.max(max, item.y + item.h), 0);
      return [
        ...prev,
        { ...fallback, y: maxY, minW: def?.minW, minH: def?.minH },
      ];
    });
  }, []);

  const visibleWidgets = useMemo(
    () => widgetDefs.filter((w) => !closedIds.has(w.id)),
    [closedIds],
  );
  const closedWidgets = useMemo(
    () => widgetDefs.filter((w) => closedIds.has(w.id)),
    [closedIds],
  );
  const visibleLayout = useMemo(
    () => layout.filter((item) => !closedIds.has(item.i)),
    [layout, closedIds],
  );

  return (
    <Box sx={{ px: 2, pb: 3 }}>
      {closedWidgets.length > 0 && (
        <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
          <Typography variant="caption" sx={{ color: "text.secondary" }}>
            Widgets ocultos:
          </Typography>
          {closedWidgets.map((w) => (
            <Chip
              key={w.id}
              size="small"
              label={w.title}
              icon={<RestoreIcon sx={{ fontSize: 14 }} />}
              onClick={() => reopenWidget(w.id)}
              variant="outlined"
            />
          ))}
        </Stack>
      )}

      <ReactGridLayout
        className="layout"
        layout={visibleLayout}
        cols={12}
        rowHeight={ROW_HEIGHT}
        onLayoutChange={handleLayoutChange}
        draggableHandle=".panel-drag-handle"
        draggableCancel=".panel-no-drag"
        compactType="vertical"
        margin={[12, 12]}
      >
        {visibleWidgets.map((widget) => (
          <div key={widget.id}>
            {widget.render({
              dragHandleClassName: "panel-drag-handle",
              isMinimized: minimizedIds.has(widget.id),
              isMaximized: maximizedId === widget.id,
              onToggleMinimize: () => toggleMinimize(widget.id),
              onToggleMaximize: () => toggleMaximize(widget.id),
              onClose: () => closeWidget(widget.id),
            })}
          </div>
        ))}
      </ReactGridLayout>
    </Box>
  );
}
