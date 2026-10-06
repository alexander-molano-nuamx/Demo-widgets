import type { Layout } from "react-grid-layout/legacy";

export type WidgetId =
  | "watchlist"
  | "watchlistPremium"
  | "watchlistAg"
  | "watchlistAgCommunity"
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
  { id: "watchlist", title: "Watchlist (MUI X Pro)", minW: 4, minH: 6 },
  { id: "watchlistPremium", title: "Watchlist (MUI X Premium)", minW: 4, minH: 6 },
  { id: "watchlistAg", title: "Watchlist (AG Grid Enterprise)", minW: 4, minH: 6 },
  { id: "watchlistAgCommunity", title: "Watchlist (AG Grid Community)", minW: 4, minH: 6 },
  { id: "chart", title: "Chart", minW: 4, minH: 8 },
  { id: "marketDepth", title: "Market depth", minW: 3, minH: 8 },
  { id: "rankings", title: "Rankings", minW: 2, minH: 8 },
];

/** The four watchlist editions open by default, stacked at the top for side-by-side comparison. */
export const defaultOpenIds: WidgetId[] = ["watchlist", "watchlistPremium", "watchlistAg", "watchlistAgCommunity"];

export const defaultLayout: Layout = [
  { i: "watchlist", x: 0, y: 0, w: 12, h: 13, minW: 4, minH: 6 },
  { i: "watchlistPremium", x: 0, y: 13, w: 12, h: 13, minW: 4, minH: 6 },
  { i: "watchlistAg", x: 0, y: 26, w: 12, h: 13, minW: 4, minH: 6 },
  { i: "watchlistAgCommunity", x: 0, y: 39, w: 12, h: 13, minW: 4, minH: 6 },
  { i: "orderBook", x: 0, y: 52, w: 4, h: 12, minW: 3, minH: 8 },
  { i: "multiMarketWatchlist", x: 4, y: 52, w: 4, h: 12, minW: 4, minH: 8 },
  { i: "lastTransactions", x: 8, y: 52, w: 4, h: 12, minW: 3, minH: 8 },
  { i: "orderManagement", x: 0, y: 64, w: 3, h: 14, minW: 3, minH: 8 },
  { i: "detail", x: 3, y: 64, w: 6, h: 14, minW: 4, minH: 10 },
  { i: "orderMessages", x: 9, y: 64, w: 3, h: 14, minW: 3, minH: 8 },
  { i: "orderEntry", x: 0, y: 78, w: 12, h: 9, minW: 6, minH: 7 },
  { i: "chart", x: 0, y: 87, w: 6, h: 16, minW: 4, minH: 8 },
  { i: "marketDepth", x: 6, y: 87, w: 4, h: 16, minW: 3, minH: 8 },
  { i: "rankings", x: 10, y: 87, w: 2, h: 16, minW: 2, minH: 8 },
];

/** Maps a drawer menu's full path to the widget it should open. */
export const widgetPathMap: Record<string, WidgetId> = {
  "/mercado/profundidad-de-mercado": "marketDepth",
  "/mercado/graficos": "chart",
  "/mercado/watchlist": "watchlist",
  "/mercado/watchlist-premium": "watchlistPremium",
  "/mercado/watchlist-ag-grid": "watchlistAg",
  "/mercado/watchlist-ag-grid-community": "watchlistAgCommunity",
  "/mercado/rankings": "rankings",
  "/area-negociacion/ingreso-de-ordenes": "orderEntry",
  "/area-negociacion/mensajes": "orderMessages",
  "/area-negociacion/libro-de-ordenes": "orderBook",
  "/area-negociacion/watchlist-multimercado": "multiMarketWatchlist",
  "/area-negociacion/ultimas-transacciones": "lastTransactions",
  "/area-negociacion/administracion-de-ordenes": "orderManagement",
  "/area-negociacion/detalle": "detail",
};
