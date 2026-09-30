"use client";

import { useMemo, useState } from "react";
import { Select, Typography } from "@bvcco/bvc-digital-package-library";
import { generateCandles } from "@/lib/mock-data";
import { LibraryPanelWindow, type PanelWindowControls } from "./LibraryPanelWindow";
import { LibraryCandlestickChart } from "./LibraryCandlestickChart";

const timeframeOptions = [
  { value: "1h", label: "1h" },
  { value: "4h", label: "4h" },
  { value: "12h", label: "12h" },
  { value: "1d", label: "1d" },
];

interface LibraryChartPanelProps extends PanelWindowControls {
  dragHandleClassName?: string;
}

export function LibraryChartPanel({ dragHandleClassName, ...controls }: LibraryChartPanelProps) {
  const [timeframe, setTimeframe] = useState(timeframeOptions[2]);
  const candles = useMemo(() => generateCandles(42), []);

  return (
    <LibraryPanelWindow
      title="Chart"
      dragHandleClassName={dragHandleClassName}
      {...controls}
      headerExtra={
        <div style={{ minWidth: 72, fontSize: "0.7rem" }}>
          <Select
            options={timeframeOptions}
            value={timeframe}
            onChange={(value: unknown) => setTimeframe(value as (typeof timeframeOptions)[number])}
            isSearchable={false}
            maxMenuHeight={160}
            maxSelectedItems={999}
          />
        </div>
      }
    >
      <div style={{ display: "flex", justifyContent: "space-between", padding: "6px 12px 0" }}>
        <Typography type="paragraph3" color="tertiary" colortype="normal" style={{ fontWeight: 700 }}>
          Grupo Aval
        </Typography>
      </div>
      <div style={{ flex: 1 }}>
        <LibraryCandlestickChart candles={candles} />
      </div>
      <div style={{ padding: "0 12px 8px" }}>
        <Typography type="caption" color="disabled" colortype="dark">
          Volume {candles[candles.length - 1]?.volume}
        </Typography>
      </div>
    </LibraryPanelWindow>
  );
}
