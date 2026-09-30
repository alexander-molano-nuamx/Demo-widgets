"use client";

import { Typography } from "@bvcco/bvc-digital-package-library";
import { orderMessageRows, type OrderMessageRow } from "@/lib/mock-data";
import { LibraryPanelWindow, type PanelWindowControls } from "./LibraryPanelWindow";

const statusColor: Record<OrderMessageRow["status"], string> = {
  Acepted: "#3f9d39",
  Placed: "#A28700",
  Rejected: "#b63b3d",
};

interface LibraryOrderMessagesPanelProps extends PanelWindowControls {
  dragHandleClassName?: string;
}

export function LibraryOrderMessagesPanel({ dragHandleClassName, ...controls }: LibraryOrderMessagesPanelProps) {
  return (
    <LibraryPanelWindow title="Mensajes de órdenes" dragHandleClassName={dragHandleClassName} {...controls}>
      <Typography type="caption" color="disabled" colortype="dark" style={{ display: "block", padding: "8px 12px 4px", fontWeight: 700 }}>
        Hoy
      </Typography>
      {orderMessageRows.map((row) => (
        <div key={row.id} style={{ padding: "6px 12px", borderBottom: "1px solid rgba(0,0,0,0.08)" }}>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <Typography type="caption" color="disabled" colortype="dark">{row.hora}</Typography>
            <span style={{ fontSize: "0.7rem", fontWeight: 700, color: statusColor[row.status] }}>{row.status}</span>
          </div>
          <Typography type="paragraph3" color="tertiary" colortype="normal">{row.description}</Typography>
        </div>
      ))}
    </LibraryPanelWindow>
  );
}
