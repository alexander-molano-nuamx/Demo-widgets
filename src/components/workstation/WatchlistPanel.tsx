"use client";

import { Box } from "@mui/material";
import type { GridColDef } from "@mui/x-data-grid";
import { DataGrid } from "@nuam/common-fe-lib-components";
import { watchlistRows, type WatchlistRow } from "@/lib/mock-data";
import { PanelWindow, type PanelWindowControls } from "./panels/PanelWindow";

const columns: GridColDef<WatchlistRow>[] = [
  { field: "id", headerName: "ID", width: 130 },
  { field: "fileId", headerName: "ID de archivo", width: 130 },
  { field: "name", headerName: "Nombre", width: 160, flex: 1 },
  { field: "category", headerName: "Categoría", width: 110 },
  { field: "market", headerName: "Mercado", width: 130 },
  { field: "segment", headerName: "Segmento", width: 140 },
  { field: "currency", headerName: "Moneda", width: 130 },
  { field: "country", headerName: "País", width: 90 },
];

interface WatchlistPanelProps extends PanelWindowControls {
  dragHandleClassName?: string;
}

export function WatchlistPanel({
  dragHandleClassName,
  ...controls
}: WatchlistPanelProps) {
  return (
    <PanelWindow
      title="Watchlist"
      dragHandleClassName={dragHandleClassName}
      {...controls}
    >
      <Box sx={{ flex: 1, minHeight: 0 }}>
        <DataGrid
          rows={watchlistRows}
          columns={columns}
          pagination
          initialState={{
            pagination: { paginationModel: { pageSize: 10, page: 0 } },
          }}
          pageSizeOptions={[10, 25, 50]}
          language="es"
          showDownload
          handleFilters={() => {}}
          sx={{ border: "none", height: "100%" }}
        />
      </Box>
    </PanelWindow>
  );
}
