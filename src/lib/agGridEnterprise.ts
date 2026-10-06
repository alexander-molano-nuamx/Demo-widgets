import type { Module } from "ag-grid-community";
import { AllCommunityModule } from "ag-grid-community";
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
 * AG Grid Enterprise modules for the "Watchlist (AG Grid Enterprise)" widget. They are passed to
 * that grid instance only (`modules` prop), never registered globally, so the Community widget
 * does not inherit Enterprise features. Without NEXT_PUBLIC_AG_GRID_LICENSE_KEY the grid runs in
 * evaluation mode (watermark + console notice).
 */
export const AG_ENTERPRISE_MODULES: Module[] = [
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
];

const licenseKey = process.env.NEXT_PUBLIC_AG_GRID_LICENSE_KEY;
if (licenseKey) LicenseManager.setLicenseKey(licenseKey);
