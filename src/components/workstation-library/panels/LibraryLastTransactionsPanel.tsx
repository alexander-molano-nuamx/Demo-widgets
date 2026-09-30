"use client";

import { lastTransactionRows, type LastTransactionRow } from "@/lib/mock-data";
import { LibraryTable, type LibraryTableColumn } from "../LibraryTable";
import { LibraryPanelWindow, type PanelWindowControls } from "./LibraryPanelWindow";

const columns: LibraryTableColumn<LastTransactionRow>[] = [
  { key: "hora", header: "Hora" },
  { key: "nemo", header: "Nemo" },
  { key: "precio", header: "Precio" },
  { key: "cantidad", header: "Cantidad" },
  { key: "monto", header: "Monto" },
];

interface LibraryLastTransactionsPanelProps extends PanelWindowControls {
  dragHandleClassName?: string;
}

export function LibraryLastTransactionsPanel({ dragHandleClassName, ...controls }: LibraryLastTransactionsPanelProps) {
  return (
    <LibraryPanelWindow title="Últimas transacciones" dragHandleClassName={dragHandleClassName} {...controls}>
      <LibraryTable columns={columns} rows={lastTransactionRows} rowKey={(row) => row.id} />
    </LibraryPanelWindow>
  );
}
