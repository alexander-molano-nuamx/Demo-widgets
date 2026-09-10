"use client";

import { useMemo, useState } from "react";
import { Box, Stack } from "@mui/material";
import { Select, Typography } from "@nuam/common-fe-lib-components";
import { generateCandles } from "@/lib/mock-data";
import { PanelWindow, type PanelWindowControls } from "./PanelWindow";
import { CandlestickChart } from "./CandlestickChart";

const timeframeOptions = [
  { value: "1h", label: "1h" },
  { value: "4h", label: "4h" },
  { value: "12h", label: "12h" },
  { value: "1d", label: "1d" },
];

interface ChartPanelProps extends PanelWindowControls {
  dragHandleClassName?: string;
}

export function ChartPanel({ dragHandleClassName, ...controls }: ChartPanelProps) {
  const [timeframe, setTimeframe] = useState(timeframeOptions[2]);
  const candles = useMemo(() => generateCandles(42), []);

  return (
    <PanelWindow
      title="Chart"
      dragHandleClassName={dragHandleClassName}
      {...controls}
      headerExtra={
        <Select
          size="small"
          options={timeframeOptions}
          value={timeframe}
          onChange={(value) =>
            setTimeframe(value as typeof timeframeOptions[number])
          }
          variant="standard"
          disableUnderline
          formControlProps={{ sx: { minWidth: 48 } }}
          sx={{ fontSize: "0.75rem" }}
        />
      }
    >
      <Stack
        direction="row"
        sx={{ alignItems: "center", justifyContent: "space-between", px: 1.5, pt: 1 }}
      >
        <Typography variant="body2" sx={{ fontWeight: 700 }}>
          Grupo Aval
        </Typography>
      </Stack>
      <Box sx={{ flex: 1 }}>
        <CandlestickChart candles={candles} />
      </Box>
      <Stack direction="row" spacing={1} sx={{ px: 1.5, pb: 1 }}>
        <Typography variant="caption" sx={{ color: "text.secondary" }}>
          Volume {candles[candles.length - 1]?.volume}
        </Typography>
      </Stack>
    </PanelWindow>
  );
}
