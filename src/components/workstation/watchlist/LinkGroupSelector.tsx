"use client";

import { useState } from "react";
import { Box, IconButton, ListItemIcon, ListItemText, Menu, MenuItem, Tooltip } from "@mui/material";
import LinkIcon from "@mui/icons-material/Link";
import LinkOffIcon from "@mui/icons-material/LinkOff";
import CheckIcon from "@mui/icons-material/Check";
import type { LinkGroup } from "@/lib/watchlist/model";

export const linkGroupColor: Record<LinkGroup, string> = {
  none: "transparent",
  red: "#E53935",
  blue: "#1E88E5",
  green: "#43A047",
  yellow: "#FDD835",
};

export const linkGroupLabel: Record<LinkGroup, string> = {
  none: "Sin vincular",
  red: "Grupo rojo",
  blue: "Grupo azul",
  green: "Grupo verde",
  yellow: "Grupo amarillo",
};

/**
 * Event contract for widget linking (WL-23): the watchlist publishes the selected instrument for
 * its color group; widgets in the same group subscribe to it on `window`.
 */
export const LINK_EVENT = "nuam:link-instrument";
export interface LinkEventDetailV1 {
  version: 1;
  group: Exclude<LinkGroup, "none">;
  instrumentId: number;
  orderbook: string;
  country: string;
}

/** Link-group selector in the widget header (UI-18). */
export function LinkGroupSelector({ value, linkedTo, onChange }: {
  value: LinkGroup;
  linkedTo: string | null;
  onChange: (group: LinkGroup) => void;
}) {
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const title =
    value === "none" ? "Vincular con otros widgets" : `${linkGroupLabel[value]}${linkedTo ? ` · ${linkedTo}` : ""}`;
  return (
    <>
      <Tooltip title={title}>
        <IconButton
          size="small"
          aria-label={`Vinculación: ${linkGroupLabel[value]}`}
          sx={{ p: 0.25, position: "relative" }}
          onClick={(e) => setAnchor(e.currentTarget)}
        >
          {value === "none" ? <LinkOffIcon sx={{ fontSize: 14 }} /> : <LinkIcon sx={{ fontSize: 14 }} />}
          {value !== "none" && (
            <Box
              aria-hidden
              sx={{
                position: "absolute",
                right: 0,
                bottom: 0,
                width: 7,
                height: 7,
                borderRadius: "50%",
                bgcolor: linkGroupColor[value],
                border: "1px solid",
                borderColor: "background.paper",
              }}
            />
          )}
        </IconButton>
      </Tooltip>
      <Menu anchorEl={anchor} open={Boolean(anchor)} onClose={() => setAnchor(null)}>
        {(Object.keys(linkGroupLabel) as LinkGroup[]).map((group) => (
          <MenuItem
            key={group}
            selected={group === value}
            onClick={() => {
              onChange(group);
              setAnchor(null);
            }}
          >
            <ListItemIcon>
              {group === "none" ? (
                <LinkOffIcon fontSize="small" />
              ) : (
                <Box sx={{ width: 14, height: 14, borderRadius: "50%", bgcolor: linkGroupColor[group] }} />
              )}
            </ListItemIcon>
            <ListItemText>{linkGroupLabel[group]}</ListItemText>
            {group === value && <CheckIcon fontSize="small" sx={{ ml: 1 }} />}
          </MenuItem>
        ))}
      </Menu>
    </>
  );
}
