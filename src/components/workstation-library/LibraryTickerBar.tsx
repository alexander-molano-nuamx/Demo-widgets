"use client";

import styled, { keyframes } from "styled-components";
import { Typography } from "@bvcco/bvc-digital-package-library";
import { tickerItems, type TickerItem } from "@/lib/mock-data";

const numberFormatter = new Intl.NumberFormat("es-CL", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const scroll = keyframes`
  from { transform: translateX(0); }
  to { transform: translateX(-50%); }
`;

const Bar = styled.div`
  padding: 6px 0;
  border-bottom: 1px solid ${({ theme }) => theme.colors.border.tertiary.normal};
  overflow: hidden;
`;

const Track = styled.div`
  display: flex;
  width: max-content;
  animation: ${scroll} 50s linear infinite;

  &:hover {
    animation-play-state: paused;
  }
`;

const Entry = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 0 12px;
  white-space: nowrap;
  flex-shrink: 0;
  border-right: 1px solid ${({ theme }) => theme.colors.border.tertiary.normal};
`;

const Badge = styled.span<{ $positive: boolean }>`
  display: inline-block;
  font-size: 0.7rem;
  font-weight: 600;
  padding: 1px 6px;
  border-radius: ${({ theme }) => theme.borderRadius.small};
  color: ${({ $positive }) => ($positive ? "#3f9d39" : "#b63b3d")};
  background: ${({ $positive }) => ($positive ? "rgba(63,157,57,0.12)" : "rgba(182,59,61,0.12)")};
`;

function TickerEntry({ item }: { item: TickerItem }) {
  const isPositive = item.changePercent >= 0;
  return (
    <Entry>
      <Typography type="caption" color="tertiary" colortype="normal" style={{ fontWeight: 700 }}>
        {item.symbol}
      </Typography>
      <Typography type="caption" color="disabled" colortype="dark">
        {numberFormatter.format(item.price)}
      </Typography>
      <Badge $positive={isPositive}>
        {isPositive ? "▲" : "▼"} {isPositive ? "+" : ""}
        {item.changePercent.toFixed(2)}%
      </Badge>
    </Entry>
  );
}

export function LibraryTickerBar() {
  return (
    <Bar>
      <Track>
        {[...tickerItems, ...tickerItems].map((item, index) => (
          <TickerEntry key={`${item.symbol}-${index}`} item={item} />
        ))}
      </Track>
    </Bar>
  );
}
