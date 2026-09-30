"use client";

import { useState } from "react";
import { Select, Typography } from "@bvcco/bvc-digital-package-library";
import { marketDepthRows, type MarketDepthRow } from "@/lib/mock-data";
import { LibraryTable, type LibraryTableColumn } from "../LibraryTable";
import { LibraryPanelWindow, type PanelWindowControls } from "./LibraryPanelWindow";

const orderOptions = [
  { value: "todas", label: "Ordenes" },
  { value: "limite", label: "Límite" },
  { value: "mercado", label: "Mercado" },
];

const columns: LibraryTableColumn<MarketDepthRow>[] = [
  { key: "bidAcum", header: "Bid Acum.", render: (r) => r.bidAcum.toLocaleString() },
  { key: "bidQty", header: "Bid Qty.", render: (r) => r.bidQty.toLocaleString() },
  { key: "bidPrice", header: "Bid Price.", render: (r) => r.bidPrice.toFixed(2) },
  { key: "askPrice", header: "Ask Price.", render: (r) => r.askPrice.toFixed(2) },
  { key: "askQty", header: "Ask Qty.", render: (r) => r.askQty.toLocaleString() },
  { key: "askAcum", header: "Ask Acum.", render: (r) => r.askAcum.toLocaleString() },
];

interface LibraryMarketDepthPanelProps extends PanelWindowControls {
  dragHandleClassName?: string;
}

export function LibraryMarketDepthPanel({ dragHandleClassName, ...controls }: LibraryMarketDepthPanelProps) {
  const [order, setOrder] = useState(orderOptions[0]);

  return (
    <LibraryPanelWindow
      title="Market depth"
      dragHandleClassName={dragHandleClassName}
      {...controls}
      headerExtra={
        <Typography type="caption" color="success" colortype="normal" style={{ fontWeight: 700 }}>
          WS Conectado
        </Typography>
      }
    >
      <div style={{ display: "flex", justifyContent: "space-between", padding: "6px 12px 0" }}>
        <Typography type="paragraph3" color="tertiary" colortype="normal" style={{ fontWeight: 700 }}>
          Grupo AVAL.
        </Typography>
      </div>

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "4px 12px" }}>
        <div style={{ minWidth: 100, fontSize: "0.7rem" }}>
          <Select
            options={orderOptions}
            value={order}
            onChange={(value: unknown) => setOrder(value as (typeof orderOptions)[number])}
            isSearchable={false}
            maxMenuHeight={160}
            maxSelectedItems={999}
          />
        </div>
        <Typography type="caption" color="secondary" colortype="normal" style={{ fontWeight: 700 }}>
          FILTROS
        </Typography>
      </div>

      <LibraryTable columns={columns} rows={marketDepthRows} rowKey={(row) => row.bidPrice} />
    </LibraryPanelWindow>
  );
}
