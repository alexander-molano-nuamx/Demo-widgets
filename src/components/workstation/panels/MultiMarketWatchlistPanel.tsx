"use client";

import { useMemo, useState } from "react";
import { Box, Chip, Stack } from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import AddIcon from "@mui/icons-material/Add";
import CloseIcon from "@mui/icons-material/Close";
import type { GridColDef } from "@mui/x-data-grid-pro";
import { DataGridPro, TextField } from "@nuam/common-fe-lib-components";
import { multiMarketWatchlistRows, type MultiMarketWatchlistRow } from "@/lib/mock-data";
import { compactDataGridSx } from "../dataGridStyles";
import { PanelWindow, type PanelWindowControls } from "./PanelWindow";

const columns: GridColDef<MultiMarketWatchlistRow>[] = [
  { field: "symbol", headerName: "Symbol", flex: 1, minWidth: 110 },
  { field: "condicion", headerName: "Condición", width: 90 },
  { field: "moneda", headerName: "Moneda", width: 90 },
  { field: "tipo", headerName: "Tipo", width: 90 },
  { field: "last", headerName: "Last", width: 90 },
];

interface MultiMarketWatchlistPanelProps extends PanelWindowControls {
  dragHandleClassName?: string;
}

export function MultiMarketWatchlistPanel({
  dragHandleClassName,
  ...controls
}: MultiMarketWatchlistPanelProps) {
  const [search, setSearch] = useState("");

  const rows = useMemo(
    () =>
      multiMarketWatchlistRows.filter((row) =>
        row.symbol.toLowerCase().includes(search.trim().toLowerCase()),
      ),
    [search],
  );

  return (
    <PanelWindow title="Watchlist multimercado" dragHandleClassName={dragHandleClassName} {...controls}>
      <Stack direction="row" spacing={1} sx={{ alignItems: "center", px: 1.5, pt: 1 }}>
        <Box sx={{ flex: 1 }}>
          <TextField
            size="small"
            fullWidth
            placeholder="Buscar por símbolo"
            value={search}
            onChange={(value) => setSearch(String(value))}
            slotProps={{ input: { startAdornment: <SearchIcon sx={{ fontSize: 18, color: "text.secondary", mr: 0.5 }} /> } }}
          />
        </Box>
        <Chip size="small" color="primary" label="Lista" icon={<AddIcon sx={{ fontSize: 14 }} />} />
        <Chip size="small" variant="outlined" label="Favoritos" onDelete={() => {}} deleteIcon={<CloseIcon sx={{ fontSize: 14 }} />} />
      </Stack>
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
