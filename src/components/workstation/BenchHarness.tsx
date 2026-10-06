"use client";

import "@/lib/muiLicense";

import dynamic from "next/dynamic";
import { Box } from "@mui/material";
import { NuamThemeWrapper } from "@nuam/common-fe-lib-components";
import type { BenchWidget } from "@/lib/watchlist/benchmark";

// Each panel is its own chunk, so a benchmark run downloads only the grid it measures.
const panels: Record<BenchWidget, React.ComponentType> = {
  mui: dynamic(() => import("./WatchlistProPanel").then((mod) => mod.WatchlistProPanel), { ssr: false }),
  "mui-premium": dynamic(() => import("./WatchlistPremiumPanel").then((mod) => mod.WatchlistPremiumPanel), { ssr: false }),
  ag: dynamic(() => import("./AgWatchlistEnterprisePanel").then((mod) => mod.AgWatchlistEnterprisePanel), { ssr: false }),
  "ag-community": dynamic(() => import("./AgWatchlistCommunityPanel").then((mod) => mod.AgWatchlistCommunityPanel), { ssr: false }),
};

/**
 * Isolated benchmark page (`/workstation?bench=N&widget=mui|mui-premium|ag|ag-community`): a single watchlist filling the
 * viewport, without the rest of the workspace competing for the main thread.
 */
export function BenchHarness({ widget }: { widget: BenchWidget }) {
  const Panel = panels[widget];
  return (
    <NuamThemeWrapper>
      <Box sx={{ height: "100vh", p: 1, bgcolor: "background.default", boxSizing: "border-box" }}>
        <Panel />
      </Box>
    </NuamThemeWrapper>
  );
}
