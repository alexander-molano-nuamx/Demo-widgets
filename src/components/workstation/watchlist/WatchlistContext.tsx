"use client";

import { createContext, useContext } from "react";
import type { DemoState, Flag, WatchlistRow } from "@/lib/watchlist/model";

export type TicketSide = "buy" | "sell";

/** Actions cells can trigger without forcing the column definitions to be rebuilt. */
export interface WatchlistActions {
  demoState: DemoState;
  readOnly: boolean;
  openTicket: (row: WatchlistRow, side: TicketSide) => void;
  openAlert: (row: WatchlistRow) => void;
  setFlag: (id: number, flag: Flag) => void;
  cycleFlag: (id: number) => void;
  requestAccess: (row: WatchlistRow) => void;
  renameSection: (section: string) => void;
  openContextMenu: (row: WatchlistRow, x: number, y: number) => void;
  /** Ids to drag when a row is dragged: the whole selection if the row is part of it. */
  dragIdsFor: (id: number) => number[];
  activeListId: string;
}

export const WatchlistContext = createContext<WatchlistActions | null>(null);

export function useWatchlistActions() {
  const ctx = useContext(WatchlistContext);
  if (!ctx) throw new Error("useWatchlistActions must be used inside <WatchlistContext.Provider>");
  return ctx;
}
