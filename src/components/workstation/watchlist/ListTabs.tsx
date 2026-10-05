"use client";

import { useState } from "react";
import { Box, IconButton, InputBase, ListItemIcon, ListItemText, Menu, MenuItem, Tab, Tabs, Tooltip } from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import LockIcon from "@mui/icons-material/LockOutlined";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import EditIcon from "@mui/icons-material/Edit";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import DeleteIcon from "@mui/icons-material/DeleteOutlined";
import type { WatchList } from "@/lib/watchlist/model";
import { ConfirmDialog } from "./dialogs";

/**
 * Drag & drop contract for instruments leaving the watchlist (WL-25). Any widget can accept a
 * drop by reading this MIME type; the payload is versioned so consumers can evolve safely.
 */
export const INSTRUMENT_DRAG_MIME = "application/x-nuam-instrument";
export interface InstrumentDragPayloadV1 {
  version: 1;
  ids: number[];
  orderbooks: string[];
  sourceListId: string;
}

interface ListTabsProps {
  lists: WatchList[];
  activeListId: string;
  onSelect: (id: string) => void;
  onCreate: () => string;
  onRename: (id: string, name: string) => void;
  onDuplicate: (id: string) => void;
  onDelete: (id: string) => void;
  onDropInstruments: (listId: string, payload: InstrumentDragPayloadV1) => void;
}

/** List selector (WL-01/05): inline rename (double click or menu), duplicate, delete with confirmation. */
export function ListTabs({
  lists,
  activeListId,
  onSelect,
  onCreate,
  onRename,
  onDuplicate,
  onDelete,
  onDropInstruments,
}: ListTabsProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [menuAnchor, setMenuAnchor] = useState<HTMLElement | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [dropTarget, setDropTarget] = useState<string | null>(null);
  const active = lists.find((l) => l.id === activeListId);

  const startEdit = (list: WatchList) => {
    if (list.kind === "system") return;
    setEditingId(list.id);
    setDraft(list.name);
  };

  const commitEdit = () => {
    if (editingId && draft.trim()) onRename(editingId, draft.trim().slice(0, 40));
    setEditingId(null);
  };

  return (
    <Box sx={{ display: "flex", alignItems: "center", minWidth: 0, flex: 1 }}>
      <Tabs
        value={activeListId}
        onChange={(_, value) => onSelect(value)}
        variant="scrollable"
        scrollButtons="auto"
        aria-label="Listas del watchlist"
        sx={{ minHeight: 26, "& .MuiTab-root": { minHeight: 26, py: 0, px: 1, fontSize: 11, fontWeight: 700, textTransform: "none" } }}
      >
        {lists.map((list) => (
          <Tab
            key={list.id}
            value={list.id}
            onDoubleClick={() => startEdit(list)}
            onDragOver={(e) => {
              if (list.kind === "system" || !e.dataTransfer.types.includes(INSTRUMENT_DRAG_MIME)) return;
              e.preventDefault();
              e.dataTransfer.dropEffect = "copy";
              setDropTarget(list.id);
            }}
            onDragLeave={() => setDropTarget((t) => (t === list.id ? null : t))}
            onDrop={(e) => {
              setDropTarget(null);
              const raw = e.dataTransfer.getData(INSTRUMENT_DRAG_MIME);
              if (!raw || list.kind === "system") return;
              e.preventDefault();
              try {
                const payload = JSON.parse(raw) as InstrumentDragPayloadV1;
                if (payload.version === 1 && Array.isArray(payload.ids)) onDropInstruments(list.id, payload);
              } catch {
                // Malformed payload from an unknown source: ignore.
              }
            }}
            sx={dropTarget === list.id ? { outline: "2px dashed", outlineColor: "primary.main", outlineOffset: -2 } : undefined}
            icon={list.kind === "system" ? <LockIcon sx={{ fontSize: 12 }} aria-label="Lista del sistema, solo lectura" /> : undefined}
            iconPosition="start"
            label={
              editingId === list.id ? (
                <InputBase
                  autoFocus
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  onBlur={commitEdit}
                  onClick={(e) => e.stopPropagation()}
                  onKeyDown={(e) => {
                    e.stopPropagation();
                    if (e.key === "Enter") commitEdit();
                    if (e.key === "Escape") setEditingId(null);
                  }}
                  inputProps={{ "aria-label": "Nombre de la lista", maxLength: 40 }}
                  sx={{ fontSize: 11, fontWeight: 700, width: Math.max(60, draft.length * 7) }}
                />
              ) : (
                list.name
              )
            }
          />
        ))}
      </Tabs>
      <Tooltip title="Nueva lista">
        <IconButton
          size="small"
          aria-label="Nueva lista"
          sx={{ p: 0.25 }}
          onClick={() => {
            const id = onCreate();
            setEditingId(id);
            setDraft(`Lista ${lists.filter((l) => l.kind === "user").length + 1}`);
          }}
        >
          <AddIcon sx={{ fontSize: 16 }} />
        </IconButton>
      </Tooltip>
      <Tooltip title="Acciones de la lista">
        <IconButton size="small" aria-label="Acciones de la lista" sx={{ p: 0.25 }} onClick={(e) => setMenuAnchor(e.currentTarget)}>
          <MoreVertIcon sx={{ fontSize: 16 }} />
        </IconButton>
      </Tooltip>
      <Menu anchorEl={menuAnchor} open={Boolean(menuAnchor)} onClose={() => setMenuAnchor(null)}>
        <MenuItem
          disabled={active?.kind !== "user"}
          onClick={() => {
            if (active) startEdit(active);
            setMenuAnchor(null);
          }}
        >
          <ListItemIcon>
            <EditIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Renombrar</ListItemText>
        </MenuItem>
        <MenuItem
          onClick={() => {
            if (active) onDuplicate(active.id);
            setMenuAnchor(null);
          }}
        >
          <ListItemIcon>
            <ContentCopyIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>{active?.kind === "system" ? "Copiar a lista propia" : "Duplicar"}</ListItemText>
        </MenuItem>
        <MenuItem
          disabled={active?.kind !== "user" || lists.filter((l) => l.kind === "user").length <= 1}
          onClick={() => {
            setConfirmDelete(true);
            setMenuAnchor(null);
          }}
        >
          <ListItemIcon>
            <DeleteIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Eliminar</ListItemText>
        </MenuItem>
      </Menu>
      <ConfirmDialog
        open={confirmDelete}
        title="Eliminar lista"
        message={`¿Eliminar la lista "${active?.name ?? ""}" con ${active?.items.length ?? 0} instrumentos? Esta acción no se puede deshacer.`}
        confirmLabel="Eliminar"
        onConfirm={() => active && onDelete(active.id)}
        onClose={() => setConfirmDelete(false)}
      />
    </Box>
  );
}
