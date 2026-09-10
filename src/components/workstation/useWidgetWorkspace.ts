"use client";

import { useCallback, useRef, useState } from "react";
import type { Layout } from "react-grid-layout/legacy";
import { defaultLayout, widgetMeta, type WidgetId } from "@/lib/widget-registry";

const COLLAPSED_H = 2;

export function useWidgetWorkspace() {
  const [layout, setLayout] = useState<Layout>(defaultLayout);
  const [minimizedIds, setMinimizedIds] = useState<Set<WidgetId>>(new Set());
  const [maximizedId, setMaximizedId] = useState<WidgetId | null>(null);
  const [closedIds, setClosedIds] = useState<Set<WidgetId>>(new Set());
  const restoreHeights = useRef<Map<WidgetId, number>>(new Map());

  const handleLayoutChange = useCallback((newLayout: Layout) => {
    setLayout((prev) =>
      newLayout.map((item) => {
        const prevItem = prev.find((p) => p.i === item.i);
        return prevItem ? { ...item, minW: prevItem.minW, minH: prevItem.minH } : item;
      }),
    );
  }, []);

  const toggleMinimize = useCallback((id: WidgetId) => {
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

  const toggleMaximize = useCallback((id: WidgetId) => {
    setMaximizedId((prev) => (prev === id ? null : id));
  }, []);

  const closeWidget = useCallback((id: WidgetId) => {
    setClosedIds((prev) => new Set(prev).add(id));
    setMaximizedId((prev) => (prev === id ? null : prev));
  }, []);

  const reopenWidget = useCallback((id: WidgetId) => {
    setClosedIds((prev) => {
      if (!prev.has(id)) return prev;
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
    setLayout((prev) => {
      if (prev.some((item) => item.i === id)) return prev;
      const meta = widgetMeta.find((w) => w.id === id);
      const fallback = defaultLayout.find((item) => item.i === id)!;
      const maxY = prev.reduce((max, item) => Math.max(max, item.y + item.h), 0);
      return [
        ...prev,
        { ...fallback, y: maxY, minW: meta?.minW, minH: meta?.minH },
      ];
    });
  }, []);

  return {
    layout,
    minimizedIds,
    maximizedId,
    closedIds,
    handleLayoutChange,
    toggleMinimize,
    toggleMaximize,
    closeWidget,
    reopenWidget,
  };
}

export type WidgetWorkspace = ReturnType<typeof useWidgetWorkspace>;
