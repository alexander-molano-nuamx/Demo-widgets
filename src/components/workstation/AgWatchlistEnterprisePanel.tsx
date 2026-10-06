"use client";

import { AG_ENTERPRISE_MODULES } from "@/lib/agGridEnterprise";
import { AgWatchlistPanel } from "./AgWatchlistPanel";
import type { PanelWindowControls } from "./panels/PanelWindow";

/** Entry point of the AG Grid Enterprise watchlist: the only place that loads Enterprise modules. */
export function AgWatchlistEnterprisePanel(props: PanelWindowControls & { dragHandleClassName?: string }) {
  return <AgWatchlistPanel {...props} edition="enterprise" modules={AG_ENTERPRISE_MODULES} />;
}
