"use client";

import { Box, Table, TableBody, TableCell, TableHead, TableRow } from "@mui/material";
import { Typography } from "@nuam/common-fe-lib-components";
import {
  instrumentRankingRows,
  participationRankingRows,
} from "@/lib/mock-data";
import { PanelWindow, type PanelWindowControls } from "./PanelWindow";

interface RankingsPanelProps extends PanelWindowControls {
  dragHandleClassName?: string;
}

export function RankingsPanel({
  dragHandleClassName,
  ...controls
}: RankingsPanelProps) {
  return (
    <PanelWindow
      title="Rankings"
      dragHandleClassName={dragHandleClassName}
      {...controls}
    >
      <Box sx={{ flex: 1, overflow: "auto" }}>
        <Typography
          variant="caption"
          sx={{ display: "block", px: 1.5, pt: 1, fontWeight: 700 }}
        >
          Instrumentos - Renta variable
        </Typography>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell sx={{ fontSize: "0.65rem" }}>Instrumento</TableCell>
              <TableCell sx={{ fontSize: "0.65rem" }} align="right">
                Valor
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {instrumentRankingRows.map((row, index) => (
              <TableRow key={`${row.instrumento}-${index}`}>
                <TableCell sx={{ fontSize: "0.7rem" }}>{row.instrumento}</TableCell>
                <TableCell sx={{ fontSize: "0.7rem" }} align="right">
                  {row.valor}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

        <Typography
          variant="caption"
          sx={{ display: "block", px: 1.5, pt: 1.5, fontWeight: 700 }}
        >
          Participación - Renta variable
        </Typography>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell sx={{ fontSize: "0.65rem" }}>Corredora</TableCell>
              <TableCell sx={{ fontSize: "0.65rem" }} align="right">
                Cantidad
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {participationRankingRows.map((row, index) => (
              <TableRow key={`${row.corredora}-${index}`}>
                <TableCell sx={{ fontSize: "0.7rem" }}>{row.corredora}</TableCell>
                <TableCell sx={{ fontSize: "0.7rem" }} align="right">
                  {row.cantidad}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Box>
    </PanelWindow>
  );
}
