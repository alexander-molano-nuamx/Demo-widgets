"use client";

import { Box } from "@mui/material";
import type { GridColDef } from "@mui/x-data-grid-pro";
import { DataGridPro } from "@nuam/common-fe-lib-components";
import { lastTransactionRows, type LastTransactionRow } from "@/lib/mock-data";
import { compactDataGridSx } from "../dataGridStyles";
import { PanelWindow, type PanelWindowControls } from "./PanelWindow";

const columns: GridColDef<LastTransactionRow>[] = [
  { field: "hora", headerName: "Hora", width: 90 },
  { field: "nemo", headerName: "Nemo", flex: 1, minWidth: 100 },
  { field: "precio", headerName: "Precio", width: 90 },
  { field: "cantidad", headerName: "Cantidad", width: 100 },
  { field: "monto", headerName: "Monto", width: 100 },
];

interface LastTransactionsPanelProps extends PanelWindowControls {
  dragHandleClassName?: string;
}

export function LastTransactionsPanel({
  dragHandleClassName,
  ...controls
}: LastTransactionsPanelProps) {
  return (
    <PanelWindow title="Últimas transacciones" dragHandleClassName={dragHandleClassName} {...controls}>
      <Box sx={{ flex: 1, minHeight: 0 }}>
        <DataGridPro
          rows={lastTransactionRows}
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
