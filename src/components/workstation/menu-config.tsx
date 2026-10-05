import SwapVertIcon from "@mui/icons-material/SwapVert";
import NotificationsNoneIcon from "@mui/icons-material/NotificationsNone";
import ShowChartIcon from "@mui/icons-material/ShowChart";
import MenuBookIcon from "@mui/icons-material/MenuBook";
import TuneIcon from "@mui/icons-material/Tune";
import StarBorderIcon from "@mui/icons-material/StarBorder";
import LeaderboardOutlinedIcon from "@mui/icons-material/LeaderboardOutlined";
import PublicIcon from "@mui/icons-material/Public";
import HistoryIcon from "@mui/icons-material/History";
import AssignmentIcon from "@mui/icons-material/Assignment";
import ArticleIcon from "@mui/icons-material/Article";
import type { IPage } from "@nuam/common-fe-lib-components";

export const menuPages: IPage[] = [
  {
    name: "Área de negociación",
    path: "/area-negociacion",
    icon: <SwapVertIcon fontSize="small" />,
    children: [
      {
        name: "Ingreso de órdenes",
        path: "ingreso-de-ordenes",
        icon: <SwapVertIcon fontSize="small" />,
      },
      {
        name: "Libro de órdenes",
        path: "libro-de-ordenes",
        icon: <MenuBookIcon fontSize="small" />,
      },
      {
        name: "Watchlist multimercado",
        path: "watchlist-multimercado",
        icon: <PublicIcon fontSize="small" />,
      },
      {
        name: "Últimas transacciones",
        path: "ultimas-transacciones",
        icon: <HistoryIcon fontSize="small" />,
      },
      {
        name: "Administración de órdenes",
        path: "administracion-de-ordenes",
        icon: <AssignmentIcon fontSize="small" />,
      },
      {
        name: "Detalle",
        path: "detalle",
        icon: <ArticleIcon fontSize="small" />,
      },
      {
        name: "Mensajes de órdenes",
        path: "mensajes",
        icon: <NotificationsNoneIcon fontSize="small" />,
      },
    ],
  },
  {
    name: "Mercado",
    path: "/mercado",
    icon: <ShowChartIcon fontSize="small" />,
    children: [
      {
        name: "Profundidad de mercado",
        path: "profundidad-de-mercado",
        icon: <MenuBookIcon fontSize="small" />,
      },
      {
        name: "Gráficos",
        path: "graficos",
        icon: <TuneIcon fontSize="small" />,
      },
      {
        name: "Watchlist",
        path: "watchlist",
        icon: <StarBorderIcon fontSize="small" />,
      },
      {
        name: "Watchlist (AG Grid)",
        path: "watchlist-ag-grid",
        icon: <StarBorderIcon fontSize="small" />,
      },
      {
        name: "Rankings",
        path: "rankings",
        icon: <LeaderboardOutlinedIcon fontSize="small" />,
      },
    ],
  },
];
