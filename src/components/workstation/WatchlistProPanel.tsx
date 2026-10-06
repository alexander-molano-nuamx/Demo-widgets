"use client";

import type { GridColDef } from "@mui/x-data-grid-pro";
import { DataGridPro } from "@nuam/common-fe-lib-components";
import type { PanelWindowControls } from "./panels/PanelWindow";
import { WatchlistPanel, type WatchlistGridProps } from "./WatchlistPanel";

// The core leaves the Premium-only props (rowGroupingModel, cellSelection) undefined for Pro.
function ProGrid({ columns, ...props }: WatchlistGridProps) {
  // Same (memoized) array; the wrapper only types it as mutable.
  return <DataGridPro {...props} columns={columns as GridColDef[]} language="es" enableColumnMenu />;
}

/** Entry point of the MUI X Pro watchlist (nuam DataGridPro wrapper). */
export function WatchlistProPanel(props: PanelWindowControls & { dragHandleClassName?: string }) {
  return <WatchlistPanel {...props} edition="pro" Grid={ProGrid} />;
}
