import { AllCommunityModule, ModuleRegistry } from "ag-grid-community";
import {
  CalculatedColumnsModule,
  CellSelectionModule,
  ClipboardModule,
  ColumnMenuModule,
  ColumnsToolPanelModule,
  ContextMenuModule,
  FiltersToolPanelModule,
  LicenseManager,
  RowGroupingModule,
  SetFilterModule,
  SideBarModule,
  SparklinesModule,
} from "ag-grid-enterprise";
import { AgChartsCommunityModule } from "ag-charts-community";

/**
 * AG Grid Enterprise modules used by the AG Grid watchlist. Only what the watchlist needs is
 * registered, to keep the bundle in check. Without NEXT_PUBLIC_AG_GRID_LICENSE_KEY the grid runs
 * in evaluation mode (watermark + console notice).
 */
ModuleRegistry.registerModules([
  AllCommunityModule,
  RowGroupingModule,
  ContextMenuModule,
  ColumnMenuModule,
  ColumnsToolPanelModule,
  FiltersToolPanelModule,
  SideBarModule,
  SetFilterModule,
  ClipboardModule,
  CellSelectionModule,
  CalculatedColumnsModule,
  SparklinesModule.with(AgChartsCommunityModule),
]);

const licenseKey = process.env.NEXT_PUBLIC_AG_GRID_LICENSE_KEY;
if (licenseKey) LicenseManager.setLicenseKey(licenseKey);
