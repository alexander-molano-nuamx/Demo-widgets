"use client";

import { Box, Stack, Table, TableBody, TableCell, TableHead, TableRow } from "@mui/material";
import { Typography } from "@nuam/common-fe-lib-components";
import { detailBookRows, detailTransactionRows } from "@/lib/mock-data";
import { compactTableSx } from "../dataGridStyles";
import { PanelWindow, type PanelWindowControls } from "./PanelWindow";

interface DetailPanelProps extends PanelWindowControls {
  dragHandleClassName?: string;
}

export function DetailPanel({ dragHandleClassName, ...controls }: DetailPanelProps) {
  const rowCount = Math.max(detailBookRows.length, detailTransactionRows.length);

  return (
    <PanelWindow title="Detalle" dragHandleClassName={dragHandleClassName} {...controls}>
      <Box sx={{ px: 1.5, pt: 1 }}>
        <Box
          sx={{
            display: "inline-block",
            px: 1.5,
            py: 0.5,
            bgcolor: "action.hover",
            borderRadius: 1,
            fontWeight: 700,
          }}
        >
          <Typography variant="body2" sx={{ fontWeight: 700 }}>
            COPEC
          </Typography>
        </Box>
      </Box>

      <Stack direction="row" spacing={3} sx={{ px: 1.5, py: 1 }}>
        <Typography variant="caption" sx={{ color: "text.secondary" }}>
          Último: 6.750
        </Typography>
        <Typography variant="caption" sx={{ color: "success.main" }}>
          Var: +0.00%
        </Typography>
        <Typography variant="caption" sx={{ color: "text.secondary" }}>
          Apertura: 6.750
        </Typography>
        <Typography variant="caption" sx={{ color: "text.secondary" }}>
          Monto: 0.0 MM
        </Typography>
      </Stack>

      <Box sx={{ flex: 1, overflow: "auto", px: 0.5 }}>
        <Table size="small" stickyHeader sx={compactTableSx}>
          <TableHead>
            <TableRow>
              <TableCell colSpan={3} align="center" sx={{ fontSize: "0.7rem", fontWeight: 700 }}>
                Compra
              </TableCell>
              <TableCell colSpan={3} align="center" sx={{ fontSize: "0.7rem", fontWeight: 700 }}>
                Venta
              </TableCell>
              <TableCell colSpan={3} align="center" sx={{ fontSize: "0.7rem", fontWeight: 700 }}>
                Transacciones
              </TableCell>
            </TableRow>
            <TableRow>
              <TableCell sx={{ fontSize: "0.65rem" }}>N</TableCell>
              <TableCell sx={{ fontSize: "0.65rem" }}>Cant.</TableCell>
              <TableCell sx={{ fontSize: "0.65rem" }}>Precio</TableCell>
              <TableCell sx={{ fontSize: "0.65rem" }}>Precio</TableCell>
              <TableCell sx={{ fontSize: "0.65rem" }}>Cant.</TableCell>
              <TableCell sx={{ fontSize: "0.65rem" }}>N</TableCell>
              <TableCell sx={{ fontSize: "0.65rem" }}>Hora</TableCell>
              <TableCell sx={{ fontSize: "0.65rem" }}>Precio</TableCell>
              <TableCell sx={{ fontSize: "0.65rem" }}>Cant.</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {Array.from({ length: rowCount }).map((_, index) => {
              const book = detailBookRows[index];
              const tx = detailTransactionRows[index];
              return (
                <TableRow key={index}>
                  <TableCell sx={{ fontSize: "0.7rem" }}>{book?.buyN ?? ""}</TableCell>
                  <TableCell sx={{ fontSize: "0.7rem" }}>{book?.buyQty ?? ""}</TableCell>
                  <TableCell sx={{ fontSize: "0.7rem", fontWeight: 700, color: "success.dark" }}>
                    {book ? book.buyPrice.toFixed(3) : ""}
                  </TableCell>
                  <TableCell sx={{ fontSize: "0.7rem", fontWeight: 700, color: "error.dark" }}>
                    {book?.sellPrice != null ? book.sellPrice.toFixed(3) : ""}
                  </TableCell>
                  <TableCell sx={{ fontSize: "0.7rem" }}>{book?.sellQty ?? ""}</TableCell>
                  <TableCell sx={{ fontSize: "0.7rem" }}>{book?.sellN ?? ""}</TableCell>
                  <TableCell sx={{ fontSize: "0.7rem" }}>{tx?.hora ?? ""}</TableCell>
                  <TableCell sx={{ fontSize: "0.7rem" }}>{tx ? tx.precio.toFixed(3) : ""}</TableCell>
                  <TableCell sx={{ fontSize: "0.7rem" }}>{tx?.cantidad ?? ""}</TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </Box>
    </PanelWindow>
  );
}
