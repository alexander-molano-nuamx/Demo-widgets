"use client";

import { watchlistRows, type WatchlistRow } from "@/lib/mock-data";
import { LibraryTable, type LibraryTableColumn } from "../LibraryTable";
import { LibraryPanelWindow, type PanelWindowControls } from "./LibraryPanelWindow";

const columns: LibraryTableColumn<WatchlistRow>[] = [
  { key: "id", header: "ID" },
  { key: "fileId", header: "ID de archivo" },
  { key: "name", header: "Nombre" },
  { key: "category", header: "Categoría" },
  { key: "market", header: "Mercado" },
  { key: "segment", header: "Segmento" },
  { key: "currency", header: "Moneda" },
  { key: "country", header: "País" },
];

interface LibraryWatchlistPanelProps extends PanelWindowControls {
  dragHandleClassName?: string;
}

export function LibraryWatchlistPanel({ dragHandleClassName, ...controls }: LibraryWatchlistPanelProps) {
  return (
    <LibraryPanelWindow title="Watchlist" dragHandleClassName={dragHandleClassName} {...controls}>
      <LibraryTable columns={columns} rows={watchlistRows} rowKey={(row) => row.id} />
    </LibraryPanelWindow>
  );
}
