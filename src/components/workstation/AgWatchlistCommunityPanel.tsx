"use client";

import { AG_COMMUNITY_MODULES } from "@/lib/agGridCommunity";
import { AgWatchlistPanel } from "./AgWatchlistPanel";
import type { PanelWindowControls } from "./panels/PanelWindow";

/** Entry point of the AG Grid Community watchlist: Community modules only, no Enterprise code. */
export function AgWatchlistCommunityPanel(props: PanelWindowControls & { dragHandleClassName?: string }) {
  return <AgWatchlistPanel {...props} edition="community" modules={AG_COMMUNITY_MODULES} />;
}
