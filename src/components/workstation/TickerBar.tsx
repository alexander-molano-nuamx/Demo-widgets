"use client";

import { Box, Chip, Stack } from "@mui/material";
import ArrowDropUpIcon from "@mui/icons-material/ArrowDropUp";
import ArrowDropDownIcon from "@mui/icons-material/ArrowDropDown";
import { Typography } from "@nuam/common-fe-lib-components";
import { tickerItems, type TickerItem } from "@/lib/mock-data";

const numberFormatter = new Intl.NumberFormat("es-CL", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

function TickerEntry({ item }: { item: TickerItem }) {
  const isPositive = item.changePercent >= 0;
  return (
    <Stack
      direction="row"
      spacing={1}
      sx={{ alignItems: "center", px: 1.5, whiteSpace: "nowrap", flexShrink: 0 }}
    >
      <Typography variant="caption" sx={{ fontWeight: 700 }}>
        {item.symbol}
      </Typography>
      <Typography variant="caption" sx={{ color: "text.secondary" }}>
        {numberFormatter.format(item.price)}
      </Typography>
      <Chip
        size="small"
        icon={
          isPositive ? (
            <ArrowDropUpIcon fontSize="small" />
          ) : (
            <ArrowDropDownIcon fontSize="small" />
          )
        }
        label={`${isPositive ? "+" : ""}${item.changePercent.toFixed(2)}%`}
        sx={{
          height: 20,
          fontSize: "0.7rem",
          fontWeight: 600,
          bgcolor: isPositive ? "success.light" : "error.light",
          color: isPositive ? "success.dark" : "error.dark",
          "& .MuiChip-icon": {
            color: isPositive ? "success.dark" : "error.dark",
          },
        }}
      />
    </Stack>
  );
}

export function TickerBar() {
  return (
    <Box
      sx={{
        py: 1,
        borderBottom: "1px solid",
        borderColor: "divider",
        overflow: "hidden",
        "@keyframes ticker-scroll": {
          from: { transform: "translateX(0)" },
          to: { transform: "translateX(-50%)" },
        },
      }}
    >
      <Stack
        direction="row"
        divider={<Box sx={{ width: "1px", bgcolor: "divider", my: 1, flexShrink: 0 }} />}
        sx={{
          width: "max-content",
          animation: "ticker-scroll 50s linear infinite",
          "&:hover": { animationPlayState: "paused" },
        }}
      >
        {[...tickerItems, ...tickerItems].map((item, index) => (
          <TickerEntry key={`${item.symbol}-${index}`} item={item} />
        ))}
      </Stack>
    </Box>
  );
}
