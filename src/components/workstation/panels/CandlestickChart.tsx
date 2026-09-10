"use client";

import { useMemo, useState } from "react";
import { Box, Stack } from "@mui/material";
import { Typography } from "@nuam/common-fe-lib-components";
import type { Candle } from "@/lib/mock-data";

interface CandlestickChartProps {
  candles: Candle[];
}

const PRICE_WIDTH = 640;
const PRICE_HEIGHT = 230;
const VOLUME_HEIGHT = 90;
const AXIS_GUTTER = 48;
const PADDING_TOP = 24;
const PADDING_BOTTOM = 20;

export function CandlestickChart({ candles }: CandlestickChartProps) {
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  const { high, low, avg } = useMemo(() => {
    const highs = candles.map((c) => c.high);
    const lows = candles.map((c) => c.low);
    const closes = candles.map((c) => c.close);
    return {
      high: Math.max(...highs),
      low: Math.min(...lows),
      avg: closes.reduce((sum, v) => sum + v, 0) / closes.length,
    };
  }, [candles]);

  const maxVolume = useMemo(
    () => Math.max(...candles.map((c) => c.volume)),
    [candles],
  );

  const plotWidth = PRICE_WIDTH - AXIS_GUTTER;
  const priceRange = high - low || 1;
  const step = plotWidth / candles.length;
  const candleWidth = Math.max(2, step * 0.55);

  const priceToY = (price: number) =>
    PADDING_TOP +
    ((high - price) / priceRange) * (PRICE_HEIGHT - PADDING_TOP - PADDING_BOTTOM);

  const volumeToY = (volume: number) =>
    VOLUME_HEIGHT - (volume / maxVolume) * (VOLUME_HEIGHT - 12);

  const priceTicks = 5;
  const priceTickValues = Array.from({ length: priceTicks }, (_, i) =>
    low + (priceRange * i) / (priceTicks - 1),
  );

  const timeTickEvery = Math.ceil(candles.length / 6);
  const hovered = hoverIndex !== null ? candles[hoverIndex] : null;

  return (
    <Box>
      <Stack direction="row" spacing={2} sx={{ px: 1.5, py: 0.5 }}>
        <Typography variant="caption" sx={{ color: "text.secondary" }}>
          Min: {low.toFixed(2)} - Max {high.toFixed(2)}
        </Typography>
        <Typography variant="caption" sx={{ color: "text.secondary" }}>
          Promedio: {avg.toFixed(4)}
        </Typography>
      </Stack>

      <Box sx={{ position: "relative", px: 1 }}>
        <svg
          viewBox={`0 0 ${PRICE_WIDTH} ${PRICE_HEIGHT}`}
          width="100%"
          height={PRICE_HEIGHT}
          style={{ display: "block" }}
          onMouseLeave={() => setHoverIndex(null)}
        >
          {priceTickValues.map((value) => (
            <g key={value}>
              <line
                x1={0}
                x2={plotWidth}
                y1={priceToY(value)}
                y2={priceToY(value)}
                stroke="var(--mui-palette-divider)"
                strokeDasharray="2 3"
              />
              <text
                x={plotWidth + 6}
                y={priceToY(value) + 3}
                fontSize={9}
                fill="var(--mui-palette-text-secondary)"
              >
                {value.toFixed(3)}
              </text>
            </g>
          ))}

          {candles.map((candle, index) => {
            const x = index * step + step / 2;
            const isUp = candle.close >= candle.open;
            const color = isUp
              ? "var(--mui-palette-success-main)"
              : "var(--mui-palette-error-main)";
            const bodyTop = priceToY(Math.max(candle.open, candle.close));
            const bodyBottom = priceToY(Math.min(candle.open, candle.close));

            return (
              <g
                key={candle.time + index}
                onMouseEnter={() => setHoverIndex(index)}
              >
                <rect
                  x={x - step / 2}
                  y={0}
                  width={step}
                  height={PRICE_HEIGHT}
                  fill="transparent"
                />
                <line
                  x1={x}
                  x2={x}
                  y1={priceToY(candle.high)}
                  y2={priceToY(candle.low)}
                  stroke={color}
                  strokeWidth={1}
                />
                <rect
                  x={x - candleWidth / 2}
                  y={bodyTop}
                  width={candleWidth}
                  height={Math.max(1, bodyBottom - bodyTop)}
                  fill={color}
                />
              </g>
            );
          })}

          {hovered && hoverIndex !== null && (
            <g>
              <line
                x1={hoverIndex * step + step / 2}
                x2={hoverIndex * step + step / 2}
                y1={0}
                y2={PRICE_HEIGHT}
                stroke="var(--mui-palette-text-secondary)"
                strokeDasharray="2 3"
              />
              <line
                x1={0}
                x2={plotWidth}
                y1={priceToY(hovered.high)}
                y2={priceToY(hovered.high)}
                stroke="var(--mui-palette-text-secondary)"
                strokeDasharray="2 3"
              />
              <text
                x={hoverIndex * step + step / 2 + 4}
                y={priceToY(hovered.high) - 4}
                fontSize={9}
                fill="var(--mui-palette-text-primary)"
              >
                H: {hovered.high.toFixed(4)}
              </text>
              <text
                x={hoverIndex * step + step / 2 + 4}
                y={priceToY(hovered.low) + 12}
                fontSize={9}
                fill="var(--mui-palette-text-primary)"
              >
                L: {hovered.low.toFixed(4)}
              </text>
            </g>
          )}
        </svg>

        <svg
          viewBox={`0 0 ${PRICE_WIDTH} ${VOLUME_HEIGHT}`}
          width="100%"
          height={VOLUME_HEIGHT}
          style={{ display: "block" }}
        >
          {candles.map((candle, index) => {
            const x = index * step + step / 2;
            const isUp = candle.close >= candle.open;
            const color = isUp
              ? "var(--mui-palette-success-main)"
              : "var(--mui-palette-error-main)";
            const y = volumeToY(candle.volume);
            return (
              <rect
                key={candle.time + index}
                x={x - candleWidth / 2}
                y={y}
                width={candleWidth}
                height={VOLUME_HEIGHT - y}
                fill={color}
                opacity={0.55}
              />
            );
          })}
        </svg>

        <Stack
          direction="row"
          sx={{ justifyContent: "space-between", px: 0.5, mt: 0.5 }}
        >
          {candles
            .filter((_, index) => index % timeTickEvery === 0)
            .map((candle) => (
              <Typography
                key={candle.time}
                variant="caption"
                sx={{ color: "text.secondary", fontSize: "0.65rem" }}
              >
                {candle.time}
              </Typography>
            ))}
        </Stack>
      </Box>
    </Box>
  );
}
