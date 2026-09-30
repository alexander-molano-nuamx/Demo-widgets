"use client";

import { Typography } from "@bvcco/bvc-digital-package-library";
import { detailBookRows, detailTransactionRows } from "@/lib/mock-data";
import { LibraryPanelWindow, type PanelWindowControls } from "./LibraryPanelWindow";

interface LibraryDetailPanelProps extends PanelWindowControls {
  dragHandleClassName?: string;
}

export function LibraryDetailPanel({ dragHandleClassName, ...controls }: LibraryDetailPanelProps) {
  const rowCount = Math.max(detailBookRows.length, detailTransactionRows.length);

  return (
    <LibraryPanelWindow title="Detalle" dragHandleClassName={dragHandleClassName} {...controls}>
      <div style={{ padding: "8px 12px 0" }}>
        <Typography type="paragraph3" color="tertiary" colortype="normal" style={{ fontWeight: 700 }}>
          COPEC
        </Typography>
      </div>

      <div style={{ display: "flex", gap: 16, padding: "6px 12px" }}>
        <Typography type="caption" color="disabled" colortype="dark">Último: 6.750</Typography>
        <Typography type="caption" color="success" colortype="normal">Var: +0.00%</Typography>
        <Typography type="caption" color="disabled" colortype="dark">Apertura: 6.750</Typography>
        <Typography type="caption" color="disabled" colortype="dark">Monto: 0.0 MM</Typography>
      </div>

      <div style={{ overflow: "auto", padding: "0 6px" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.7rem" }}>
          <thead>
            <tr>
              <th colSpan={3} style={{ textAlign: "center", fontWeight: 700, padding: "3px 4px" }}>Compra</th>
              <th colSpan={3} style={{ textAlign: "center", fontWeight: 700, padding: "3px 4px" }}>Venta</th>
              <th colSpan={3} style={{ textAlign: "center", fontWeight: 700, padding: "3px 4px" }}>Transacciones</th>
            </tr>
            <tr>
              <th style={{ padding: "2px 4px", fontSize: "0.65rem" }}>N</th>
              <th style={{ padding: "2px 4px", fontSize: "0.65rem" }}>Cant.</th>
              <th style={{ padding: "2px 4px", fontSize: "0.65rem" }}>Precio</th>
              <th style={{ padding: "2px 4px", fontSize: "0.65rem" }}>Precio</th>
              <th style={{ padding: "2px 4px", fontSize: "0.65rem" }}>Cant.</th>
              <th style={{ padding: "2px 4px", fontSize: "0.65rem" }}>N</th>
              <th style={{ padding: "2px 4px", fontSize: "0.65rem" }}>Hora</th>
              <th style={{ padding: "2px 4px", fontSize: "0.65rem" }}>Precio</th>
              <th style={{ padding: "2px 4px", fontSize: "0.65rem" }}>Cant.</th>
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: rowCount }).map((_, index) => {
              const book = detailBookRows[index];
              const tx = detailTransactionRows[index];
              return (
                <tr key={index}>
                  <td style={{ padding: "2px 4px" }}>{book?.buyN ?? ""}</td>
                  <td style={{ padding: "2px 4px" }}>{book?.buyQty ?? ""}</td>
                  <td style={{ padding: "2px 4px", fontWeight: 700, color: "#3f9d39" }}>
                    {book ? book.buyPrice.toFixed(3) : ""}
                  </td>
                  <td style={{ padding: "2px 4px", fontWeight: 700, color: "#b63b3d" }}>
                    {book?.sellPrice != null ? book.sellPrice.toFixed(3) : ""}
                  </td>
                  <td style={{ padding: "2px 4px" }}>{book?.sellQty ?? ""}</td>
                  <td style={{ padding: "2px 4px" }}>{book?.sellN ?? ""}</td>
                  <td style={{ padding: "2px 4px" }}>{tx?.hora ?? ""}</td>
                  <td style={{ padding: "2px 4px" }}>{tx ? tx.precio.toFixed(3) : ""}</td>
                  <td style={{ padding: "2px 4px" }}>{tx?.cantidad ?? ""}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </LibraryPanelWindow>
  );
}
