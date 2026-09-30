"use client";

import { useMemo, useState } from "react";
import { orderBookRows, type OrderBookRow } from "@/lib/mock-data";
import { LibraryTable, type LibraryTableColumn } from "../LibraryTable";
import { LibrarySearchInput } from "../LibrarySearchInput";
import { LibraryPanelWindow, type PanelWindowControls } from "./LibraryPanelWindow";

const columns: LibraryTableColumn<OrderBookRow>[] = [
  { key: "instrumento", header: "Instrumento" },
  { key: "valor", header: "Valor" },
  { key: "cantidad", header: "Cantidad" },
  { key: "ops", header: "OPS" },
];

interface LibraryOrderBookPanelProps extends PanelWindowControls {
  dragHandleClassName?: string;
}

export function LibraryOrderBookPanel({ dragHandleClassName, ...controls }: LibraryOrderBookPanelProps) {
  const [search, setSearch] = useState("");

  const rows = useMemo(
    () => orderBookRows.filter((row) => row.instrumento.toLowerCase().includes(search.trim().toLowerCase())),
    [search],
  );

  return (
    <LibraryPanelWindow title="Libro de órdenes" dragHandleClassName={dragHandleClassName} {...controls}>
      <div style={{ padding: "8px 12px 4px" }}>
        <LibrarySearchInput
          placeholder="Buscar por nemotécnico"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>
      <LibraryTable columns={columns} rows={rows} rowKey={(row) => row.id} />
    </LibraryPanelWindow>
  );
}
