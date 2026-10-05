"use client";

import { createContext, useContext } from "react";
import { Button, Stack } from "@mui/material";
import PlaylistAddIcon from "@mui/icons-material/PlaylistAdd";
import LockIcon from "@mui/icons-material/LockOutlined";
import CloudOffIcon from "@mui/icons-material/CloudOff";
import FilterAltOffIcon from "@mui/icons-material/FilterAltOff";
import { Typography } from "@nuam/common-fe-lib-components";

export type OverlayKind = "empty" | "no-permission" | "error" | "filtered";

interface OverlayState {
  kind: OverlayKind;
  onAdd: () => void;
  onImport: () => void;
  onRetry: () => void;
  onRequestAccess: () => void;
  onClearFilters: () => void;
}

export const OverlayContext = createContext<OverlayState | null>(null);

const content: Record<OverlayKind, { icon: typeof LockIcon; title: string; body: string }> = {
  empty: {
    icon: PlaylistAddIcon,
    title: "Esta lista está vacía",
    body: "Busca instrumentos para agregarlos, importa un archivo o pega nemotécnicos con Ctrl+V.",
  },
  "no-permission": {
    icon: LockIcon,
    title: "Sin permiso sobre el dato",
    body: "Tu perfil no tiene contratado el paquete de datos de esta lista. Puedes solicitar acceso a tu administrador.",
  },
  error: {
    icon: CloudOffIcon,
    title: "No se pudo cargar la lista",
    body: "Error de conexión con el servicio de market data. Tus listas y configuración no se perdieron.",
  },
  filtered: {
    icon: FilterAltOffIcon,
    title: "Ningún instrumento coincide con los filtros",
    body: "Ajusta o limpia los filtros para ver los instrumentos de la lista.",
  },
};

/** Single overlay component for every "no rows" state of the watchlist (WL-34, UI-31). */
export function WatchlistOverlay() {
  const state = useContext(OverlayContext);
  if (!state) return null;
  const { icon: Icon, title, body } = content[state.kind];
  return (
    <Stack
      role="status"
      spacing={1}
      sx={{ height: "100%", alignItems: "center", justifyContent: "center", textAlign: "center", px: 3 }}
    >
      <Icon sx={{ fontSize: 32, color: state.kind === "error" ? "error.main" : "text.disabled" }} />
      <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
        {title}
      </Typography>
      <Typography variant="caption" sx={{ color: "text.secondary", maxWidth: 360 }}>
        {body}
      </Typography>
      <Stack direction="row" spacing={1} sx={{ pt: 0.5, pointerEvents: "auto" }}>
        {state.kind === "empty" && (
          <>
            <Button size="small" variant="contained" onClick={state.onAdd}>
              Agregar instrumento
            </Button>
            <Button size="small" onClick={state.onImport}>
              Importar
            </Button>
          </>
        )}
        {state.kind === "no-permission" && (
          <Button size="small" variant="contained" onClick={state.onRequestAccess}>
            Solicitar acceso
          </Button>
        )}
        {state.kind === "error" && (
          <Button size="small" variant="contained" onClick={state.onRetry}>
            Reintentar
          </Button>
        )}
        {state.kind === "filtered" && (
          <Button size="small" onClick={state.onClearFilters}>
            Limpiar filtros
          </Button>
        )}
      </Stack>
    </Stack>
  );
}
