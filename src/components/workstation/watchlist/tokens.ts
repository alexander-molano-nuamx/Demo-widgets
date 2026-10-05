import type { Theme } from "@mui/material";
import type { SystemStyleObject } from "@mui/system";

/**
 * Semantic market colors (UI-29). Every up/down/neutral color in the watchlist goes through
 * these CSS variables so light and dark themes stay consistent and meet WCAG AA (≥ 4.5:1)
 * against the paper background. The nuam palette's success/error mains are pastel and fail
 * contrast as text, which is why they are not used directly.
 */
const light = {
  "--wl-up": "#0A7A52",
  "--wl-down": "#C62828",
  "--wl-neutral": "#5F6368",
  "--wl-up-bg": "rgba(10, 122, 82, 0.22)",
  "--wl-down-bg": "rgba(198, 40, 40, 0.20)",
  "--wl-warn-bg": "rgba(237, 108, 2, 0.20)",
  "--wl-info-bg": "rgba(2, 136, 209, 0.16)",
  "--wl-masked": "#8A8A8A",
};

const dark = {
  "--wl-up": "#5FE0B4",
  "--wl-down": "#FF8A80",
  "--wl-neutral": "#B8B8B8",
  "--wl-up-bg": "rgba(95, 224, 180, 0.26)",
  "--wl-down-bg": "rgba(255, 138, 128, 0.26)",
  "--wl-warn-bg": "rgba(255, 183, 77, 0.24)",
  "--wl-info-bg": "rgba(79, 195, 247, 0.22)",
  "--wl-masked": "#9A9A9A",
};

export const marketColor = {
  up: "var(--wl-up)",
  down: "var(--wl-down)",
  neutral: "var(--wl-neutral)",
  masked: "var(--wl-masked)",
} as const;

export function directionColor(value: number | null | undefined) {
  if (value == null || value === 0) return marketColor.neutral;
  return value > 0 ? marketColor.up : marketColor.down;
}

export function watchlistRootSx(theme: Theme, flashMs: number): SystemStyleObject<Theme> {
  return {
    ...light,
    ...theme.applyStyles("dark", dark),
    "--wl-flash-ms": `${flashMs}ms`,
    position: "relative",
    display: "flex",
    flexDirection: "column",
    flex: 1,
    minHeight: 0,
    "@keyframes wl-flash-up": {
      "0%": { backgroundColor: "var(--wl-up-bg)" },
      "100%": { backgroundColor: "transparent" },
    },
    "@keyframes wl-flash-down": {
      "0%": { backgroundColor: "var(--wl-down-bg)" },
      "100%": { backgroundColor: "transparent" },
    },
    // Flash layer sits behind the cell text; animation length is user-configurable (UI-24).
    "& .wl-flash": {
      position: "relative",
      display: "flex",
      alignItems: "center",
      justifyContent: "flex-end",
      width: "calc(100% + 12px)",
      height: "100%",
      margin: "0 -6px",
      padding: "0 6px",
    },
    "& .wl-flash.wl-flash-up": { animation: "wl-flash-up var(--wl-flash-ms) ease-out" },
    "& .wl-flash.wl-flash-down": { animation: "wl-flash-down var(--wl-flash-ms) ease-out" },
    "&.wl-no-flash .wl-flash": { animation: "none !important" },
    // Conditional formatting rules (UI-09).
    "& .wl-cf-up": { backgroundColor: "var(--wl-up-bg)" },
    "& .wl-cf-down": { backgroundColor: "var(--wl-down-bg)" },
    "& .wl-cf-warn": { backgroundColor: "var(--wl-warn-bg)" },
    "& .wl-cf-info": { backgroundColor: "var(--wl-info-bg)" },
    "& .watchlist-row .row-actions": { opacity: 0, transition: "opacity 120ms ease-in" },
    "& .watchlist-row:hover .row-actions, & .watchlist-row.Mui-selected .row-actions, & .watchlist-row:focus-within .row-actions":
      { opacity: 1 },
    "& .watchlist-row-suspended": { opacity: 0.6 },
    "& .watchlist-row-alert-triggered": { boxShadow: `inset 3px 0 0 ${theme.palette.warning.dark}` },
  };
}

export const visuallyHidden = {
  position: "absolute",
  width: 1,
  height: 1,
  padding: 0,
  margin: -1,
  overflow: "hidden",
  clip: "rect(0 0 0 0)",
  whiteSpace: "nowrap",
  border: 0,
} as const;
