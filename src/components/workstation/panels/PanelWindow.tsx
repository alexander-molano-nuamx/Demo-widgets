"use client";

import { createPortal } from "react-dom";
import { Box, IconButton, Stack, Tooltip } from "@mui/material";
import RemoveIcon from "@mui/icons-material/Remove";
import AddIcon from "@mui/icons-material/Add";
import CropSquareIcon from "@mui/icons-material/CropSquare";
import FilterNoneIcon from "@mui/icons-material/FilterNone";
import CloseIcon from "@mui/icons-material/Close";
import { Typography } from "@nuam/common-fe-lib-components";
import type { ReactNode } from "react";

export interface PanelWindowControls {
  isMinimized?: boolean;
  isMaximized?: boolean;
  onToggleMinimize?: () => void;
  onToggleMaximize?: () => void;
  onClose?: () => void;
}

interface PanelWindowProps extends PanelWindowControls {
  title: string;
  headerExtra?: ReactNode;
  children: ReactNode;
  dragHandleClassName?: string;
}

export function PanelWindow({
  title,
  headerExtra,
  children,
  dragHandleClassName,
  isMinimized,
  isMaximized,
  onToggleMinimize,
  onToggleMaximize,
  onClose,
}: PanelWindowProps) {
  const header = (
    <Stack
      direction="row"
      alignItems="center"
      justifyContent="space-between"
      className={dragHandleClassName}
      sx={{
        px: 1,
        py: 0.5,
        bgcolor: "action.disabledBackground",
        borderBottom: isMinimized ? "none" : "1px solid",
        borderColor: "divider",
        cursor: dragHandleClassName ? "grab" : "default",
        flexShrink: 0,
      }}
    >
      <Typography variant="caption" sx={{ fontWeight: 700 }}>
        {title}
      </Typography>
      <Stack
        direction="row"
        alignItems="center"
        spacing={0.5}
        className="panel-no-drag"
        onMouseDown={(e) => e.stopPropagation()}
      >
        {headerExtra}
        <Tooltip title={isMinimized ? "Restaurar" : "Minimizar"}>
          <IconButton size="small" sx={{ p: 0.25 }} onClick={onToggleMinimize}>
            {isMinimized ? (
              <AddIcon sx={{ fontSize: 14 }} />
            ) : (
              <RemoveIcon sx={{ fontSize: 14 }} />
            )}
          </IconButton>
        </Tooltip>
        <Tooltip title={isMaximized ? "Restaurar" : "Maximizar"}>
          <IconButton size="small" sx={{ p: 0.25 }} onClick={onToggleMaximize}>
            {isMaximized ? (
              <FilterNoneIcon sx={{ fontSize: 11 }} />
            ) : (
              <CropSquareIcon sx={{ fontSize: 12 }} />
            )}
          </IconButton>
        </Tooltip>
        <Tooltip title="Cerrar">
          <IconButton size="small" sx={{ p: 0.25 }} onClick={onClose}>
            <CloseIcon sx={{ fontSize: 14 }} />
          </IconButton>
        </Tooltip>
      </Stack>
    </Stack>
  );

  const frame = (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        border: "1px solid",
        borderColor: "divider",
        borderRadius: 1,
        bgcolor: "background.paper",
        height: "100%",
        overflow: "hidden",
        ...(isMaximized && {
          position: "fixed",
          inset: 24,
          zIndex: 1300,
          boxShadow: 8,
        }),
      }}
    >
      {header}
      {!isMinimized && (
        <Box
          sx={{
            flex: 1,
            minHeight: 0,
            display: "flex",
            flexDirection: "column",
            overflow: "auto",
          }}
        >
          {children}
        </Box>
      )}
    </Box>
  );

  if (isMaximized && typeof document !== "undefined") {
    return createPortal(
      <>
        <Box
          onClick={onToggleMaximize}
          sx={{
            position: "fixed",
            inset: 0,
            bgcolor: "rgba(0,0,0,0.4)",
            zIndex: 1299,
          }}
        />
        {frame}
      </>,
      document.body,
    );
  }

  return frame;
}
