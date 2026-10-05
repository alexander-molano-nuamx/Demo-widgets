import type { Layout } from "react-grid-layout/legacy";

export type WidgetId =
  | "watchlist"
  | "watchlistAg"
  | "chart"
  | "marketDepth"
  | "rankings"
  | "orderBook"
  | "multiMarketWatchlist"
  | "lastTransactions"
  | "orderManagement"
  | "detail"
  | "orderMessages"
  | "orderEntry";

export interface WidgetMeta {
  id: WidgetId;
  title: string;
  minW: number;
  minH: number;
}

export const widgetMeta: WidgetMeta[] = [
  { id: "orderBook", title: "Libro de órdenes", minW: 3, minH: 8 },
  { id: "multiMarketWatchlist", title: "Watchlist multimercado", minW: 4, minH: 8 },
  { id: "lastTransactions", title: "Últimas transacciones", minW: 3, minH: 8 },
  { id: "orderManagement", title: "Administración de órdenes", minW: 3, minH: 8 },
  { id: "detail", title: "Detalle", minW: 4, minH: 10 },
  { id: "orderMessages", title: "Mensajes de órdenes", minW: 3, minH: 8 },
  { id: "orderEntry", title: "Ingreso de órdenes", minW: 6, minH: 7 },
  { id: "watchlist", title: "Watchlist", minW: 4, minH: 6 },
  { id: "watchlistAg", title: "Watchlist (AG Grid)", minW: 4, minH: 6 },
  { id: "chart", title: "Chart", minW: 4, minH: 8 },
  { id: "marketDepth", title: "Market depth", minW: 3, minH: 8 },
  { id: "rankings", title: "Rankings", minW: 2, minH: 8 },
];

export const defaultLayout: Layout = [
  { i: "orderBook", x: 0, y: 0, w: 4, h: 12, minW: 3, minH: 8 },
  { i: "multiMarketWatchlist", x: 4, y: 0, w: 4, h: 12, minW: 4, minH: 8 },
  { i: "lastTransactions", x: 8, y: 0, w: 4, h: 12, minW: 3, minH: 8 },
  { i: "orderManagement", x: 0, y: 12, w: 3, h: 14, minW: 3, minH: 8 },
  { i: "detail", x: 3, y: 12, w: 6, h: 14, minW: 4, minH: 10 },
  { i: "orderMessages", x: 9, y: 12, w: 3, h: 14, minW: 3, minH: 8 },
  { i: "orderEntry", x: 0, y: 26, w: 12, h: 9, minW: 6, minH: 7 },
  { i: "watchlist", x: 0, y: 35, w: 12, h: 13, minW: 4, minH: 6 },
  { i: "watchlistAg", x: 0, y: 48, w: 12, h: 13, minW: 4, minH: 6 },
  { i: "chart", x: 0, y: 61, w: 6, h: 16, minW: 4, minH: 8 },
  { i: "marketDepth", x: 6, y: 61, w: 4, h: 16, minW: 3, minH: 8 },
  { i: "rankings", x: 10, y: 61, w: 2, h: 16, minW: 2, minH: 8 },
];

/** Maps a drawer menu's full path to the widget it should open. */
export const widgetPathMap: Record<string, WidgetId> = {
  "/mercado/profundidad-de-mercado": "marketDepth",
  "/mercado/graficos": "chart",
  "/mercado/watchlist": "watchlist",
  "/mercado/watchlist-ag-grid": "watchlistAg",
  "/mercado/rankings": "rankings",
  "/area-negociacion/ingreso-de-ordenes": "orderEntry",
  "/area-negociacion/mensajes": "orderMessages",
  "/area-negociacion/libro-de-ordenes": "orderBook",
  "/area-negociacion/watchlist-multimercado": "multiMarketWatchlist",
  "/area-negociacion/ultimas-transacciones": "lastTransactions",
  "/area-negociacion/administracion-de-ordenes": "orderManagement",
  "/area-negociacion/detalle": "detail",
};
