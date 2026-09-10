"use client";

import { Box, Stack } from "@mui/material";
import { Typography } from "@nuam/common-fe-lib-components";
import { orderMessageRows, type OrderMessageRow } from "@/lib/mock-data";
import { PanelWindow, type PanelWindowControls } from "./PanelWindow";

const statusColor: Record<OrderMessageRow["status"], string> = {
  Acepted: "success.main",
  Placed: "warning.main",
  Rejected: "error.main",
};

interface OrderMessagesPanelProps extends PanelWindowControls {
  dragHandleClassName?: string;
}

export function OrderMessagesPanel({ dragHandleClassName, ...controls }: OrderMessagesPanelProps) {
  return (
    <PanelWindow title="Mensajes de órdenes" dragHandleClassName={dragHandleClassName} {...controls}>
      <Box sx={{ flex: 1, overflow: "auto" }}>
        <Typography
          variant="caption"
          sx={{ display: "block", px: 1.5, pt: 1, fontWeight: 700, color: "text.secondary" }}
        >
          Hoy
        </Typography>
        {orderMessageRows.map((row) => (
          <Box key={row.id} sx={{ px: 1.5, py: 0.75, borderBottom: "1px solid", borderColor: "divider" }}>
            <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
              <Typography variant="caption" sx={{ color: "text.secondary" }}>
                {row.hora}
              </Typography>
              <Typography variant="caption" sx={{ fontWeight: 700, color: statusColor[row.status] }}>
                {row.status}
              </Typography>
            </Stack>
            <Typography variant="body2">{row.description}</Typography>
          </Box>
        ))}
      </Box>
    </PanelWindow>
  );
}
