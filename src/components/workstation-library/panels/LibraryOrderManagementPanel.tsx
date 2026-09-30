"use client";

import { orderManagementRows, type OrderManagementRow } from "@/lib/mock-data";
import { LibraryTable, type LibraryTableColumn } from "../LibraryTable";
import { LibraryPanelWindow, type PanelWindowControls } from "./LibraryPanelWindow";

const columns: LibraryTableColumn<OrderManagementRow>[] = [
  { key: "orderId", header: "ID" },
  { key: "hora", header: "Hora" },
  { key: "nemo", header: "Nemo" },
  { key: "mdo", header: "MDO" },
  {
    key: "side",
    header: "I",
    render: (row) => (
      <span style={{ fontWeight: 700, color: row.side === "V" ? "#3f9d39" : "#b63b3d" }}>{row.side}</span>
    ),
  },
  { key: "cantidad", header: "Cantidad" },
];

interface LibraryOrderManagementPanelProps extends PanelWindowControls {
  dragHandleClassName?: string;
}

export function LibraryOrderManagementPanel({ dragHandleClassName, ...controls }: LibraryOrderManagementPanelProps) {
  return (
    <LibraryPanelWindow title="Administración de órdenes" dragHandleClassName={dragHandleClassName} {...controls}>
      <LibraryTable columns={columns} rows={orderManagementRows} rowKey={(row) => row.id} />
    </LibraryPanelWindow>
  );
}
