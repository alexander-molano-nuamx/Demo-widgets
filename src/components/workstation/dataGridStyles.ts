import type { SxProps, Theme } from "@mui/material";

/**
 * Shared compact look for every DataGridPro instance: 12px font, tighter rows,
 * and only the "Filtros" button visible in the toolbar (Columnas/Actualizar/⋮ hidden)
 * while keeping it in its native, right-aligned toolbar slot.
 */
export const compactDataGridSx: SxProps<Theme> = {
  border: "none",
  height: "100%",
  fontSize: 12,
  "& .MuiDataGrid-columnHeaderTitle": {
    fontSize: 12,
    fontWeight: 700,
  },
  "& .MuiDataGrid-cell": {
    fontSize: 12,
  },
  "& .MuiDataGrid-toolbarContainer button:not(:first-of-type)": {
    display: "none",
  },
  "& .MuiDataGrid-footerContainer": {
    minHeight: 36,
    overflow: "hidden",
  },
  "& .MuiTablePagination-toolbar": {
    minHeight: 36,
    height: 36,
    paddingTop: 0,
    paddingBottom: 0,
  },
  "& .MuiTablePagination-selectLabel, & .MuiTablePagination-displayedRows": {
    fontSize: 12,
    margin: 0,
  },
  "& .MuiTablePagination-input": {
    fontSize: 12,
    marginRight: 1,
  },
  "& .MuiTablePagination-actions .MuiIconButton-root": {
    padding: "4px",
  },
  "& .MuiTablePagination-actions svg": {
    fontSize: 18,
  },
  "& .MuiPagination-root .MuiPaginationItem-root": {
    minWidth: 24,
    height: 24,
    fontSize: 12,
  },
};

/** Shared compact look for raw MUI <Table> widgets: 12px font, tighter cell padding. */
export const compactTableSx: SxProps<Theme> = {
  "& .MuiTableCell-root": {
    fontSize: 12,
    py: 0.25,
  },
};
