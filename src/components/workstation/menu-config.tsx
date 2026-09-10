import SwapVertIcon from "@mui/icons-material/SwapVert";
import ReceiptLongIcon from "@mui/icons-material/ReceiptLong";
import SwapHorizIcon from "@mui/icons-material/SwapHoriz";
import NotificationsNoneIcon from "@mui/icons-material/NotificationsNone";
import ShowChartIcon from "@mui/icons-material/ShowChart";
import MenuBookIcon from "@mui/icons-material/MenuBook";
import TuneIcon from "@mui/icons-material/Tune";
import StarBorderIcon from "@mui/icons-material/StarBorder";
import ListAltIcon from "@mui/icons-material/ListAlt";
import LeaderboardOutlinedIcon from "@mui/icons-material/LeaderboardOutlined";
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
        name: "Registro de órdenes",
        path: "registro-de-ordenes",
        icon: <ReceiptLongIcon fontSize="small" />,
      },
      {
        name: "Operaciones",
        path: "operaciones",
        icon: <SwapHorizIcon fontSize="small" />,
      },
      {
        name: "Mensajes",
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
        name: "Todas las operaciones",
        path: "todas-las-operaciones",
        icon: <ListAltIcon fontSize="small" />,
      },
      {
        name: "Rankings",
        path: "rankings",
        icon: <LeaderboardOutlinedIcon fontSize="small" />,
      },
    ],
  },
];
