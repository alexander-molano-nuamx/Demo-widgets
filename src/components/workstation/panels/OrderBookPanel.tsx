"use client";

import { useMemo, useState } from "react";
import { Box } from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import type { GridColDef } from "@mui/x-data-grid-pro";
import { DataGridPro, TextField } from "@nuam/common-fe-lib-components";
import { orderBookRows, type OrderBookRow } from "@/lib/mock-data";
import { compactDataGridSx } from "../dataGridStyles";
import { PanelWindow, type PanelWindowControls } from "./PanelWindow";

const columns: GridColDef<OrderBookRow>[] = [
  { field: "instrumento", headerName: "Instrumento", flex: 1, minWidth: 120 },
  { field: "valor", headerName: "Valor", width: 100 },
  { field: "cantidad", headerName: "Cantidad", width: 100 },
  { field: "ops", headerName: "OPS", width: 80 },
];

interface OrderBookPanelProps extends PanelWindowControls {
  dragHandleClassName?: string;
}

export function OrderBookPanel({ dragHandleClassName, ...controls }: OrderBookPanelProps) {
  const [search, setSearch] = useState("");

  const rows = useMemo(
    () =>
      orderBookRows.filter((row) =>
        row.instrumento.toLowerCase().includes(search.trim().toLowerCase()),
      ),
    [search],
  );

  return (
    <PanelWindow title="Libro de órdenes" dragHandleClassName={dragHandleClassName} {...controls}>
      <Box sx={{ px: 1.5, pt: 1 }}>
        <TextField
          size="small"
          fullWidth
          placeholder="Buscar por nemotecnico"
          value={search}
          onChange={(value) => setSearch(String(value))}
          slotProps={{ input: { startAdornment: <SearchIcon sx={{ fontSize: 18, color: "text.secondary", mr: 0.5 }} /> } }}
        />
      </Box>
      <Box sx={{ flex: 1, minHeight: 0, mt: 1 }}>
        <DataGridPro
          rows={rows}
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
