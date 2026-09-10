"use client";

import { useState } from "react";
import { Box, Chip, Stack, Table, TableBody, TableCell, TableHead, TableRow } from "@mui/material";
import FilterAltOutlinedIcon from "@mui/icons-material/FilterAltOutlined";
import { Select, Typography } from "@nuam/common-fe-lib-components";
import { marketDepthRows } from "@/lib/mock-data";
import { compactTableSx } from "../dataGridStyles";
import { PanelWindow, type PanelWindowControls } from "./PanelWindow";

const orderOptions = [
  { value: "todas", label: "Ordenes" },
  { value: "limite", label: "Límite" },
  { value: "mercado", label: "Mercado" },
];

interface MarketDepthPanelProps extends PanelWindowControls {
  dragHandleClassName?: string;
}

export function MarketDepthPanel({
  dragHandleClassName,
  ...controls
}: MarketDepthPanelProps) {
  const [order, setOrder] = useState(orderOptions[0]);

  return (
    <PanelWindow
      title="Market depth"
      dragHandleClassName={dragHandleClassName}
      {...controls}
      headerExtra={
        <Chip
          label="WS Conectado"
          size="small"
          color="success"
          variant="outlined"
          sx={{ height: 18, fontSize: "0.6rem" }}
        />
      }
    >
      <Stack
        direction="row"
        sx={{ alignItems: "center", justifyContent: "space-between", px: 1.5, pt: 1 }}
      >
        <Typography variant="body2" sx={{ fontWeight: 700 }}>
          Grupo AVAL.
        </Typography>
      </Stack>

      <Stack
        direction="row"
        sx={{ alignItems: "center", justifyContent: "space-between", px: 1.5, py: 0.5 }}
      >
        <Select
          size="small"
          options={orderOptions}
          value={order}
          onChange={(value) => setOrder(value as typeof orderOptions[number])}
          formControlProps={{ sx: { minWidth: 110 } }}
        />
        <Stack direction="row" spacing={0.5} sx={{ alignItems: "center" }}>
          <FilterAltOutlinedIcon sx={{ fontSize: 16, color: "primary.main" }} />
          <Typography variant="caption" sx={{ color: "primary.main", fontWeight: 700 }}>
            FILTROS
          </Typography>
        </Stack>
      </Stack>

      <Box sx={{ flex: 1, overflow: "auto", px: 0.5 }}>
        <Table size="small" stickyHeader sx={compactTableSx}>
          <TableHead>
            <TableRow>
              <TableCell sx={{ fontSize: "0.65rem" }}>Bid Acum.</TableCell>
              <TableCell sx={{ fontSize: "0.65rem" }}>Bid Qty.</TableCell>
              <TableCell sx={{ fontSize: "0.65rem" }}>Bid Price.</TableCell>
              <TableCell sx={{ fontSize: "0.65rem" }}>Ask Price.</TableCell>
              <TableCell sx={{ fontSize: "0.65rem" }}>Ask Qty.</TableCell>
              <TableCell sx={{ fontSize: "0.65rem" }}>Ask Acum.</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {marketDepthRows.map((row) => (
              <TableRow key={row.bidPrice}>
                <TableCell sx={{ fontSize: "0.7rem" }}>{row.bidAcum.toLocaleString()}</TableCell>
                <TableCell sx={{ fontSize: "0.7rem", bgcolor: "success.light" }}>
                  {row.bidQty.toLocaleString()}
                </TableCell>
                <TableCell sx={{ fontSize: "0.7rem", fontWeight: 700, color: "success.dark" }}>
                  {row.bidPrice.toFixed(2)}
                </TableCell>
                <TableCell sx={{ fontSize: "0.7rem", fontWeight: 700, color: "error.dark" }}>
                  {row.askPrice.toFixed(2)}
                </TableCell>
                <TableCell sx={{ fontSize: "0.7rem", bgcolor: "error.light" }}>
                  {row.askQty.toLocaleString()}
                </TableCell>
                <TableCell sx={{ fontSize: "0.7rem" }}>{row.askAcum.toLocaleString()}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Box>
    </PanelWindow>
  );
}
