"use client";

import { NuamThemeWrapper } from "@nuam/common-fe-lib-components";
import { DataGridPremium, type DataGridPremiumProps } from "@mui/x-data-grid-premium";
import { esES } from "@mui/x-data-grid-premium/locales";
import type { PanelWindowControls } from "./panels/PanelWindow";
import { WatchlistPanel, type WatchlistGridProps } from "./WatchlistPanel";

const localeText = esES.components.MuiDataGrid.defaultProps.localeText;

/**
 * DataGridPremium with the same theme, class and locale as the nuam DataGridPro wrapper (which has
 * no Premium variant). The nuam license key covers Pro only, so Premium runs in evaluation mode.
 */
function PremiumGrid(props: WatchlistGridProps) {
  return (
    <NuamThemeWrapper>
      <DataGridPremium className="nuamDataGrid" localeText={localeText} {...(props as unknown as DataGridPremiumProps)} />
    </NuamThemeWrapper>
  );
}

/** Entry point of the MUI X Premium watchlist. */
export function WatchlistPremiumPanel(props: PanelWindowControls & { dragHandleClassName?: string }) {
  return <WatchlistPanel {...props} edition="premium" Grid={PremiumGrid} />;
}
