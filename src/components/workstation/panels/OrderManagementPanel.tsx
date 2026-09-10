"use client";

import { Box, Typography as MuiTypography } from "@mui/material";
import type { GridColDef, GridRenderCellParams } from "@mui/x-data-grid-pro";
import { DataGridPro } from "@nuam/common-fe-lib-components";
import { orderManagementRows, type OrderManagementRow } from "@/lib/mock-data";
import { compactDataGridSx } from "../dataGridStyles";
import { PanelWindow, type PanelWindowControls } from "./PanelWindow";

const columns: GridColDef<OrderManagementRow>[] = [
  { field: "orderId", headerName: "ID", flex: 1, minWidth: 150 },
  { field: "hora", headerName: "Hora", width: 90 },
  { field: "nemo", headerName: "Nemo", width: 90 },
  { field: "mdo", headerName: "MDO", width: 80 },
  {
    field: "side",
    headerName: "I",
    width: 50,
    renderCell: (params: GridRenderCellParams<OrderManagementRow>) => (
      <MuiTypography
        variant="caption"
        sx={{
          fontWeight: 700,
          color: params.value === "V" ? "success.main" : "error.main",
        }}
      >
        {params.value}
      </MuiTypography>
    ),
  },
  { field: "cantidad", headerName: "Cantidad", width: 100 },
];

interface OrderManagementPanelProps extends PanelWindowControls {
  dragHandleClassName?: string;
}

export function OrderManagementPanel({
  dragHandleClassName,
  ...controls
}: OrderManagementPanelProps) {
  return (
    <PanelWindow title="Administración de órdenes" dragHandleClassName={dragHandleClassName} {...controls}>
      <Box sx={{ flex: 1, minHeight: 0 }}>
        <DataGridPro
          rows={orderManagementRows}
          columns={columns}
          showToolbar
          density="compact"
          pagination
          initialState={{ pagination: { paginationModel: { pageSize: 5, page: 0 } } }}
          pageSizeOptions={[5, 10, 25]}
          language="es"
          enableColumnMenu
          sx={compactDataGridSx}
        />
      </Box>
    </PanelWindow>
  );
}
