"use client";

import { Box, Chip, Stack } from "@mui/material";
import ArrowDropUpIcon from "@mui/icons-material/ArrowDropUp";
import ArrowDropDownIcon from "@mui/icons-material/ArrowDropDown";
import { Typography } from "@nuam/common-fe-lib-components";
import { tickerItems } from "@/lib/mock-data";

const numberFormatter = new Intl.NumberFormat("es-CL", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export function TickerBar() {
  return (
    <Stack
      direction="row"
      divider={<Box sx={{ width: "1px", bgcolor: "divider", my: 1 }} />}
      sx={{
        px: 2,
        py: 1,
        borderBottom: "1px solid",
        borderColor: "divider",
        overflowX: "auto",
      }}
    >
      {tickerItems.map((item) => {
        const isPositive = item.changePercent >= 0;
        return (
          <Stack
            key={item.symbol}
            direction="row"
            spacing={1}
            alignItems="center"
            sx={{ px: 1.5, whiteSpace: "nowrap" }}
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
      })}
    </Stack>
  );
}
