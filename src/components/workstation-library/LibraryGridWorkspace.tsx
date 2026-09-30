"use client";

import "react-grid-layout/css/styles.css";
import "react-resizable/css/styles.css";

import { useMemo, type ReactNode } from "react";
import GridLayout, { WidthProvider } from "react-grid-layout/legacy";
import styled from "styled-components";
import { widgetMeta, type WidgetId } from "@/lib/widget-registry";
import type { WidgetWorkspace } from "@/components/workstation/useWidgetWorkspace";
import type { PanelWindowControls } from "./panels/LibraryPanelWindow";
import { LibraryWatchlistPanel } from "./panels/LibraryWatchlistPanel";
import { LibraryChartPanel } from "./panels/LibraryChartPanel";
import { LibraryMarketDepthPanel } from "./panels/LibraryMarketDepthPanel";
import { LibraryRankingsPanel } from "./panels/LibraryRankingsPanel";
import { LibraryOrderBookPanel } from "./panels/LibraryOrderBookPanel";
import { LibraryMultiMarketWatchlistPanel } from "./panels/LibraryMultiMarketWatchlistPanel";
import { LibraryLastTransactionsPanel } from "./panels/LibraryLastTransactionsPanel";
import { LibraryOrderManagementPanel } from "./panels/LibraryOrderManagementPanel";
import { LibraryDetailPanel } from "./panels/LibraryDetailPanel";
import { LibraryOrderMessagesPanel } from "./panels/LibraryOrderMessagesPanel";
import { LibraryOrderEntryPanel } from "./panels/LibraryOrderEntryPanel";

const ReactGridLayout = WidthProvider(GridLayout);

const ROW_HEIGHT = 26;

const renderers: Record<WidgetId, (controls: Required<PanelWindowControls> & { dragHandleClassName: string }) => ReactNode> = {
  watchlist: (controls) => <LibraryWatchlistPanel {...controls} />,
  chart: (controls) => <LibraryChartPanel {...controls} />,
  marketDepth: (controls) => <LibraryMarketDepthPanel {...controls} />,
  rankings: (controls) => <LibraryRankingsPanel {...controls} />,
  orderBook: (controls) => <LibraryOrderBookPanel {...controls} />,
  multiMarketWatchlist: (controls) => <LibraryMultiMarketWatchlistPanel {...controls} />,
  lastTransactions: (controls) => <LibraryLastTransactionsPanel {...controls} />,
  orderManagement: (controls) => <LibraryOrderManagementPanel {...controls} />,
  detail: (controls) => <LibraryDetailPanel {...controls} />,
  orderMessages: (controls) => <LibraryOrderMessagesPanel {...controls} />,
  orderEntry: (controls) => <LibraryOrderEntryPanel {...controls} />,
};

type LibraryGridWorkspaceProps = WidgetWorkspace;

const Wrap = styled.div`
  padding: 0 16px 24px;
`;

const HiddenBar = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
  flex-wrap: wrap;
`;

const HiddenLabel = styled.span`
  font-size: 0.75rem;
  color: ${({ theme }) => theme.colors.font.disabled.normal};
`;

const HiddenChip = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 0.7rem;
  padding: 2px 10px;
  border-radius: ${({ theme }) => theme.borderRadius.button};
  border: 1px solid ${({ theme }) => theme.colors.border.primary.normal};
  color: ${({ theme }) => theme.colors.font.secondary.normal};
  background: transparent;
  cursor: pointer;

  &:hover {
    background: ${({ theme }) => theme.colors.bg.tableHover.normal};
  }
`;

export function LibraryGridWorkspace({
  layout,
  minimizedIds,
  maximizedId,
  closedIds,
  handleLayoutChange,
  toggleMinimize,
  toggleMaximize,
  closeWidget,
  reopenWidget,
}: LibraryGridWorkspaceProps) {
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
    <Wrap>
      {closedWidgets.length > 0 && (
        <HiddenBar>
          <HiddenLabel>Widgets ocultos:</HiddenLabel>
          {closedWidgets.map((w) => (
            <HiddenChip key={w.id} onClick={() => reopenWidget(w.id)}>
              + {w.title}
            </HiddenChip>
          ))}
        </HiddenBar>
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
    </Wrap>
  );
}
