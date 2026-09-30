"use client";

import { useMemo, useState } from "react";
import { multiMarketWatchlistRows, type MultiMarketWatchlistRow } from "@/lib/mock-data";
import { LibraryTable, type LibraryTableColumn } from "../LibraryTable";
import { LibrarySearchInput } from "../LibrarySearchInput";
import { LibraryPanelWindow, type PanelWindowControls } from "./LibraryPanelWindow";

const columns: LibraryTableColumn<MultiMarketWatchlistRow>[] = [
  { key: "symbol", header: "Symbol" },
  { key: "condicion", header: "Condición" },
  { key: "moneda", header: "Moneda" },
  { key: "tipo", header: "Tipo" },
  { key: "last", header: "Last" },
];

interface LibraryMultiMarketWatchlistPanelProps extends PanelWindowControls {
  dragHandleClassName?: string;
}

export function LibraryMultiMarketWatchlistPanel({
  dragHandleClassName,
  ...controls
}: LibraryMultiMarketWatchlistPanelProps) {
  const [search, setSearch] = useState("");

  const rows = useMemo(
    () => multiMarketWatchlistRows.filter((row) => row.symbol.toLowerCase().includes(search.trim().toLowerCase())),
    [search],
  );

  return (
    <LibraryPanelWindow title="Watchlist multimercado" dragHandleClassName={dragHandleClassName} {...controls}>
      <div style={{ padding: "8px 12px 4px" }}>
        <LibrarySearchInput
          placeholder="Buscar por símbolo"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>
      <LibraryTable columns={columns} rows={rows} rowKey={(row) => row.id} />
    </LibraryPanelWindow>
  );
}
