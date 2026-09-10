"use client";

import "react-grid-layout/css/styles.css";
import "react-resizable/css/styles.css";

import { useMemo, type ReactNode } from "react";
import GridLayout, { WidthProvider } from "react-grid-layout/legacy";
import { Box, Chip, Stack } from "@mui/material";
import RestoreIcon from "@mui/icons-material/SettingsBackupRestore";
import { Typography } from "@nuam/common-fe-lib-components";
import { widgetMeta, type WidgetId } from "@/lib/widget-registry";
import { WatchlistPanel } from "./WatchlistPanel";
import { ChartPanel } from "./panels/ChartPanel";
import { MarketDepthPanel } from "./panels/MarketDepthPanel";
import { RankingsPanel } from "./panels/RankingsPanel";
import { OrderBookPanel } from "./panels/OrderBookPanel";
import { MultiMarketWatchlistPanel } from "./panels/MultiMarketWatchlistPanel";
import { LastTransactionsPanel } from "./panels/LastTransactionsPanel";
import { OrderManagementPanel } from "./panels/OrderManagementPanel";
import { DetailPanel } from "./panels/DetailPanel";
import { OrderMessagesPanel } from "./panels/OrderMessagesPanel";
import { OrderEntryPanel } from "./panels/OrderEntryPanel";
import type { PanelWindowControls } from "./panels/PanelWindow";
import type { WidgetWorkspace } from "./useWidgetWorkspace";

const ReactGridLayout = WidthProvider(GridLayout);

const ROW_HEIGHT = 26;

const renderers: Record<WidgetId, (controls: Required<PanelWindowControls> & { dragHandleClassName: string }) => ReactNode> = {
  watchlist: (controls) => <WatchlistPanel {...controls} />,
  chart: (controls) => <ChartPanel {...controls} />,
  marketDepth: (controls) => <MarketDepthPanel {...controls} />,
  rankings: (controls) => <RankingsPanel {...controls} />,
  orderBook: (controls) => <OrderBookPanel {...controls} />,
  multiMarketWatchlist: (controls) => <MultiMarketWatchlistPanel {...controls} />,
  lastTransactions: (controls) => <LastTransactionsPanel {...controls} />,
  orderManagement: (controls) => <OrderManagementPanel {...controls} />,
  detail: (controls) => <DetailPanel {...controls} />,
  orderMessages: (controls) => <OrderMessagesPanel {...controls} />,
  orderEntry: (controls) => <OrderEntryPanel {...controls} />,
};

type GridWorkspaceProps = WidgetWorkspace;

export function GridWorkspace({
  layout,
  minimizedIds,
  maximizedId,
  closedIds,
  handleLayoutChange,
  toggleMinimize,
  toggleMaximize,
  closeWidget,
  reopenWidget,
}: GridWorkspaceProps) {
  const visibleWidgets = useMemo(
    () => widgetMeta.filter((w) => !closedIds.has(w.id)),
    [closedIds],
  );
  const closedWidgets = useMemo(
    () => widgetMeta.filter((w) => closedIds.has(w.id)),
    [closedIds],
  );
  const visibleLayout = useMemo(
    () => layout.filter((item) => !closedIds.has(item.i as WidgetId)),
    [layout, closedIds],
  );

  return (
    <Box sx={{ px: 2, pb: 3 }}>
      {closedWidgets.length > 0 && (
        <Stack direction="row" spacing={1} sx={{ alignItems: "center", mb: 1 }}>
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
            {renderers[widget.id]({
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
