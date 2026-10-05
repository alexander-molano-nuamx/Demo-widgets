"use client";

import { useMemo, useRef, useState, type ReactNode } from "react";
import {
  Alert,
  Box,
  Chip,
  Divider,
  IconButton,
  ListItemIcon,
  ListItemText,
  ListSubheader,
  Menu,
  MenuItem,
  Stack,
  TextField,
  Tooltip,
} from "@mui/material";
import MenuIcon from "@mui/icons-material/Menu";
import DownloadIcon from "@mui/icons-material/Download";
import UploadIcon from "@mui/icons-material/Upload";
import FlagIcon from "@mui/icons-material/Flag";
import FilterListIcon from "@mui/icons-material/FilterList";
import ViewColumnIcon from "@mui/icons-material/ViewColumn";
import KeyboardIcon from "@mui/icons-material/Keyboard";
import CheckIcon from "@mui/icons-material/Check";
import DeleteIcon from "@mui/icons-material/DeleteOutlined";
import CloseIcon from "@mui/icons-material/Close";
import { Button, Typography } from "@nuam/common-fe-lib-components";
import { MAX_ITEMS_PER_LIST, exchangeByCountry, type DemoState, type Flag } from "@/lib/watchlist/model";
import { formatExchangeTime } from "@/lib/watchlist/format";
import { PanelWindow, type PanelWindowControls } from "../panels/PanelWindow";
import { builtInTemplates } from "./columns";
import { flagColor, flagLabel } from "./cells";
import { AlertDialog, ConfirmDialog, FormulaDialog, ImportDialog, OrderTicketDialog, PromptDialog, RulesDrawer, parseTickers } from "./dialogs";
import { InstrumentSearch } from "./InstrumentSearch";
import { LinkGroupSelector, linkGroupLabel } from "./LinkGroupSelector";
import { ListTabs, type InstrumentDragPayloadV1 } from "./ListTabs";
import { OverlayContext } from "./overlays";
import { visuallyHidden, watchlistRootSx } from "./tokens";
import { demoStateLabel, type WatchlistController } from "./useWatchlistController";
import { WatchlistContext } from "./WatchlistContext";

export const shortcuts = [
  ["↑ ↓ ← →", "Moverse por la grilla"],
  ["Enter", "Menú de acciones de la fila"],
  ["B / C", "Comprar (ticket a precio de venta)"],
  ["S / V", "Vender (ticket a precio de compra)"],
  ["A", "Crear alerta de precio"],
  ["F", "Cambiar marca de color"],
  ["Supr", "Quitar de la lista"],
  ["Espacio", "Seleccionar fila (Shift/Ctrl para varias)"],
  ["Ctrl+V", "Pegar nemotécnicos"],
];

const flashOptions = [0, 300, 600, 900, 1500, 2500];
const menuItemSx = { fontSize: 12, minHeight: 28 };
const check = (on: boolean) => <ListItemIcon>{on ? <CheckIcon fontSize="small" /> : null}</ListItemIcon>;

interface WatchlistShellProps extends PanelWindowControls {
  wl: WatchlistController;
  title: string;
  dragHandleClassName?: string;
  /** Extra settings-menu entries specific to one grid implementation. */
  settingsExtra?: ReactNode;
  /** Extra class on the root (grid-specific styling hooks). */
  rootClassName?: string;
  children: ReactNode;
}

/**
 * Everything around the grid, shared by the MUI X and AG Grid watchlists: lists, search, filters,
 * banners, bulk actions, menus, dialogs, in-context feedback and screen-reader announcements.
 */
export function WatchlistShell({ wl, title, dragHandleClassName, settingsExtra, rootClassName, children, ...controls }: WatchlistShellProps) {
  const [menuAnchor, setMenuAnchor] = useState<HTMLElement | null>(null);
  const [templatesAnchor, setTemplatesAnchor] = useState<HTMLElement | null>(null);
  const [flagAnchor, setFlagAnchor] = useState<HTMLElement | null>(null);
  const [bulkAnchor, setBulkAnchor] = useState<{ el: HTMLElement; mode: "list" | "section" } | null>(null);
  const searchBoxRef = useRef<HTMLDivElement>(null);

  const { activeList, readOnly, listFull, listBlocked, settings, demoState, contextMenu, selectedIds, notify, setRootEl } = wl;
  const adapter = wl.getAdapter;

  const overlayState = useMemo(
    () => ({
      kind: wl.overlayKind,
      onAdd: () => searchBoxRef.current?.querySelector("input")?.focus(),
      onImport: () => wl.setImportOpen(true),
      onRetry: () => {
        wl.setDemoState("normal");
        wl.selectList(activeList.id);
      },
      onRequestAccess: () => notify("success", "Solicitud de acceso enviada a tu administrador (demo)"),
      onClearFilters: wl.clearFilters,
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- controller callbacks are stable
    [wl.overlayKind, activeList.id, notify, wl.clearFilters],
  );

  const handlePaste = (e: React.ClipboardEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement;
    if (readOnly || target.closest("input, textarea, [contenteditable=true]")) return;
    const tickers = parseTickers(e.clipboardData.getData("text"));
    if (tickers.length === 0) return;
    e.preventDefault();
    wl.importTickers(tickers);
  };

  const setDemo = (state: DemoState) => {
    wl.setDemoState(state);
    setMenuAnchor(null);
  };

  const userLists = wl.lists.filter((l) => l.kind === "user" && l.id !== activeList.id);
  const sections = Array.from(new Set(activeList.items.map((i) => i.section).filter((s): s is string => Boolean(s))));
  const ctxRow = contextMenu?.row;
  const alertTarget = wl.alertTarget;
  const existingAlert = alertTarget && alertTarget !== "list" ? wl.priceAlerts.find((a) => a.instrumentId === alertTarget.id) : undefined;
  const closeContextMenu = () => wl.setContextMenu(null);

  return (
    <PanelWindow
      title={title}
      dragHandleClassName={dragHandleClassName}
      {...controls}
      headerExtra={
        <>
          <LinkGroupSelector
            value={settings.linkGroup}
            linkedTo={wl.linkedTo}
            onChange={(group) => {
              wl.setSettings((s) => ({ ...s, linkGroup: group }));
              wl.setLinkedTo(null);
              notify("info", group === "none" ? "Watchlist desvinculado" : `Vinculado al ${linkGroupLabel[group].toLowerCase()}`);
            }}
          />
          <Tooltip
            title={
              <Box component="dl" sx={{ m: 0, display: "grid", gridTemplateColumns: "auto 1fr", columnGap: 1.5, rowGap: 0.25 }}>
                {shortcuts.map(([keys, label]) => (
                  <Box key={keys} sx={{ display: "contents" }}>
                    <Box component="dt" sx={{ fontWeight: 700 }}>{keys}</Box>
                    <Box component="dd" sx={{ m: 0 }}>{label}</Box>
                  </Box>
                ))}
              </Box>
            }
          >
            <IconButton size="small" sx={{ p: 0.25 }} aria-label="Atajos de teclado">
              <KeyboardIcon sx={{ fontSize: 14 }} />
            </IconButton>
          </Tooltip>
          <Tooltip title="Más opciones">
            <IconButton size="small" sx={{ p: 0.25 }} aria-label="Más opciones" onClick={(e) => setMenuAnchor(e.currentTarget)}>
              <MenuIcon sx={{ fontSize: 14 }} />
            </IconButton>
          </Tooltip>
        </>
      }
    >
      <WatchlistContext.Provider value={wl.actions}>
        <OverlayContext.Provider value={overlayState}>
          <Box
            ref={setRootEl}
            className={[settings.flashMs === 0 ? "wl-no-flash" : "", rootClassName ?? ""].join(" ").trim() || undefined}
            sx={(t) => watchlistRootSx(t, settings.flashMs)}
            onPaste={handlePaste}
          >
            {/* Row 1: lists */}
            <Stack direction="row" sx={{ alignItems: "center", px: 1, pt: 0.5, gap: 1 }}>
              <ListTabs
                lists={wl.lists}
                activeListId={activeList.id}
                onSelect={wl.selectList}
                onCreate={wl.createList}
                onRename={wl.renameList}
                onDuplicate={wl.duplicateList}
                onDelete={wl.deleteList}
                onDropInstruments={(listId, payload: InstrumentDragPayloadV1) => {
                  const target = wl.lists.find((l) => l.id === listId);
                  if (target) wl.reportAdd(wl.addToList(listId, payload.ids), target.name);
                }}
              />
              <Tooltip title={`Máximo ${MAX_ITEMS_PER_LIST} instrumentos por lista`}>
                <Chip
                  size="small"
                  color={listFull ? "warning" : "default"}
                  label={`${activeList.items.length}/${MAX_ITEMS_PER_LIST}`}
                  sx={{ height: 18, fontSize: 10 }}
                />
              </Tooltip>
            </Stack>

            {/* Row 2: search & tools */}
            <Stack direction="row" sx={{ alignItems: "center", px: 1, py: 0.5, gap: 1, flexWrap: "wrap" }}>
              <Box ref={searchBoxRef}>
                <InstrumentSearch
                  instruments={wl.instruments}
                  inList={new Set(activeList.items.map((i) => i.id))}
                  disabled={readOnly || listFull}
                  disabledReason={readOnly ? "Lista de solo lectura" : "Lista llena"}
                  onAdd={(inst) => wl.reportAdd(wl.addToList(activeList.id, [inst.id]), activeList.name)}
                />
              </Box>
              <TextField
                size="small"
                placeholder="Filtrar lista…"
                value={wl.quickFilter}
                onChange={(e) => wl.setQuickFilter(e.target.value)}
                slotProps={{ input: { sx: { fontSize: 11 } }, htmlInput: { "aria-label": "Filtrar instrumentos de la lista" } }}
                sx={{ width: 130 }}
              />
              <Box sx={{ flex: 1 }} />
              <Tooltip title="Filtrar por marca">
                <IconButton
                  size="small"
                  aria-label="Filtrar por marca"
                  color={wl.flagFilter === "all" ? "default" : "primary"}
                  sx={{ p: 0.25 }}
                  onClick={(e) => setFlagAnchor(e.currentTarget)}
                >
                  <FlagIcon
                    sx={{ fontSize: 16, color: wl.flagFilter !== "all" && wl.flagFilter !== "any" ? flagColor[wl.flagFilter] : undefined }}
                  />
                </IconButton>
              </Tooltip>
              {!wl.cards && (
                <Button
                  variant="text"
                  size="small"
                  startIcon={<ViewColumnIcon sx={{ fontSize: 14 }} />}
                  onClick={(e) => setTemplatesAnchor(e.currentTarget)}
                  sx={{ fontSize: 11, minWidth: 0, px: 0.75, whiteSpace: "nowrap" }}
                >
                  Columnas
                </Button>
              )}
              <Button
                variant="text"
                size="small"
                startIcon={<FilterListIcon sx={{ fontSize: 14 }} />}
                onClick={() => adapter()?.openFilters()}
                sx={{ fontSize: 11, minWidth: 0, px: 0.75, whiteSpace: "nowrap" }}
              >
                Filtros
              </Button>
              <Tooltip title="Importar (CSV o pegar nemotécnicos)">
                <span>
                  <IconButton size="small" aria-label="Importar instrumentos" sx={{ p: 0.25 }} disabled={readOnly} onClick={() => wl.setImportOpen(true)}>
                    <UploadIcon sx={{ fontSize: 16 }} />
                  </IconButton>
                </span>
              </Tooltip>
              <Tooltip title="Exportar CSV">
                <IconButton size="small" aria-label="Exportar CSV" sx={{ p: 0.25 }} onClick={() => adapter()?.exportCsv(`watchlist-${activeList.name}`)}>
                  <DownloadIcon sx={{ fontSize: 16 }} />
                </IconButton>
              </Tooltip>
            </Stack>

            {/* Contextual banners: list/system/connection state (WL-34, WL-37) */}
            <Stack sx={{ px: 1, gap: 0.5, "& .MuiAlert-root": { py: 0, fontSize: 11, alignItems: "center" }, "& .MuiAlert-icon": { py: 0.5, fontSize: 16 } }}>
              {demoState === "disconnected" && (
                <Alert severity="error" action={<Button size="small" color="inherit" onClick={() => wl.setDemoState("normal")}>Reconectar</Button>}>
                  Conexión perdida con market data. Datos desactualizados desde{" "}
                  {wl.disconnectedAt ? formatExchangeTime(wl.disconnectedAt, "CL") : "—"}. Reintentando…
                </Alert>
              )}
              {demoState === "market-closed" && (
                <Alert severity="info">
                  Mercado cerrado. Horarios: {Object.values(exchangeByCountry).map((e) => `${e.code} ${e.hours}`).join(" · ")}. Se muestran precios de cierre.
                </Alert>
              )}
              {readOnly && !listBlocked && (
                <Alert
                  severity="info"
                  action={<Button size="small" color="inherit" onClick={() => wl.duplicateList(activeList.id)}>Copiar a lista propia</Button>}
                >
                  Lista del sistema: solo lectura.
                </Alert>
              )}
              {listFull && !readOnly && (
                <Alert severity="warning">
                  Lista llena ({MAX_ITEMS_PER_LIST}/{MAX_ITEMS_PER_LIST}). Quita instrumentos o crea otra lista para agregar más.
                </Alert>
              )}
            </Stack>

            {/* Bulk actions over the multi-selection (WL-03) */}
            {selectedIds.length > 0 && !wl.cards && (
              <Stack direction="row" sx={{ alignItems: "center", gap: 1, px: 1, py: 0.25, bgcolor: "action.selected" }}>
                <Typography variant="caption" sx={{ fontWeight: 700 }}>
                  {selectedIds.length} seleccionado(s)
                </Typography>
                <Button size="small" variant="text" sx={{ fontSize: 11 }} disabled={userLists.length === 0} onClick={(e) => setBulkAnchor({ el: e.currentTarget, mode: "list" })}>
                  {readOnly ? "Copiar a lista" : "Mover a lista"}
                </Button>
                {!readOnly && (
                  <>
                    <Button size="small" variant="text" sx={{ fontSize: 11 }} onClick={(e) => setBulkAnchor({ el: e.currentTarget, mode: "section" })}>
                      Mover a sección
                    </Button>
                    <Button size="small" variant="text" color="error" sx={{ fontSize: 11 }} onClick={() => wl.removeFromList(selectedIds)}>
                      Quitar
                    </Button>
                  </>
                )}
                <Box sx={{ flex: 1 }} />
                <IconButton size="small" aria-label="Limpiar selección" sx={{ p: 0.25 }} onClick={() => wl.setSelectedIds([])}>
                  <CloseIcon sx={{ fontSize: 14 }} />
                </IconButton>
              </Stack>
            )}

            {children}

            {/* In-context feedback (WL-39): stays inside the widget, never navigates away */}
            <Stack sx={{ position: "absolute", right: 8, bottom: 44, zIndex: 4, gap: 0.5, maxWidth: 420, pointerEvents: "none" }}>
              {wl.feedback.map((f) => (
                <Alert
                  key={f.id}
                  severity={f.severity}
                  variant="filled"
                  onClose={() => wl.dismissFeedback(f.id)}
                  sx={{ py: 0, fontSize: 11, pointerEvents: "auto", boxShadow: 3 }}
                >
                  {f.message}
                </Alert>
              ))}
            </Stack>
            <Box role="status" aria-live="polite" sx={visuallyHidden}>
              {wl.announcement}
            </Box>
          </Box>

          {/* Row context menu: right click, long press, Enter or Shift+F10 (WL-22, UI-12) */}
          <Menu
            open={Boolean(contextMenu)}
            onClose={closeContextMenu}
            anchorReference="anchorPosition"
            anchorPosition={contextMenu ? { top: contextMenu.y, left: contextMenu.x } : undefined}
            slotProps={{ list: { dense: true } }}
          >
            {ctxRow && [
              <ListSubheader key="h" sx={{ lineHeight: "28px", fontSize: 11, fontWeight: 700 }}>
                {ctxRow.orderbook}
              </ListSubheader>,
              <MenuItem key="buy" sx={menuItemSx} disabled={!ctxRow.hasPermission} onClick={() => { wl.actions.openTicket(ctxRow, "buy"); closeContextMenu(); }}>
                Comprar
              </MenuItem>,
              <MenuItem key="sell" sx={menuItemSx} disabled={!ctxRow.hasPermission} onClick={() => { wl.actions.openTicket(ctxRow, "sell"); closeContextMenu(); }}>
                Vender
              </MenuItem>,
              <MenuItem key="alert" sx={menuItemSx} onClick={() => { wl.actions.openAlert(ctxRow); closeContextMenu(); }}>
                Crear alerta…
              </MenuItem>,
              <Divider key="d1" />,
              ...(["Gráfico", "Libro de órdenes", "Noticias", "Ficha"] as const).map((label) => (
                <MenuItem
                  key={label}
                  sx={menuItemSx}
                  onClick={() => {
                    wl.publishLink(ctxRow);
                    notify("info", `${label} de ${ctxRow.orderbook} (demo)`);
                    closeContextMenu();
                  }}
                >
                  {label}
                </MenuItem>
              )),
              <Divider key="d2" />,
              <MenuItem key="flags" sx={{ ...menuItemSx, gap: 0.5 }} disableRipple onClick={(e) => e.stopPropagation()}>
                Marca:
                {(["green", "yellow", "red", "blue", "none"] as Flag[]).map((flag) => (
                  <IconButton
                    key={flag}
                    size="small"
                    aria-label={`Marca ${flagLabel[flag]}`}
                    sx={{ p: 0.25 }}
                    onClick={() => {
                      wl.actions.setFlag(ctxRow.id, flag);
                      closeContextMenu();
                    }}
                  >
                    <FlagIcon sx={{ fontSize: 15, color: flagColor[flag] }} />
                  </IconButton>
                ))}
              </MenuItem>,
              ...(readOnly
                ? []
                : [
                    <MenuItem
                      key="section"
                      sx={menuItemSx}
                      onClick={() => {
                        wl.setPrompt({
                          title: "Mover a sección",
                          label: "Nombre de la sección",
                          initial: ctxRow.section ?? "",
                          onSubmit: (name) => wl.setSection([ctxRow.id], name),
                        });
                        closeContextMenu();
                      }}
                    >
                      Mover a sección…
                    </MenuItem>,
                    <MenuItem key="remove" sx={{ ...menuItemSx, color: "error.main" }} onClick={() => { wl.removeFromList([ctxRow.id]); closeContextMenu(); }}>
                      Quitar de la lista
                    </MenuItem>,
                  ]),
            ]}
          </Menu>

          {/* Bulk: move/copy to list or section */}
          <Menu anchorEl={bulkAnchor?.el} open={Boolean(bulkAnchor)} onClose={() => setBulkAnchor(null)} slotProps={{ list: { dense: true } }}>
            {bulkAnchor?.mode === "list" &&
              userLists.map((list) => (
                <MenuItem
                  key={list.id}
                  sx={menuItemSx}
                  onClick={() => {
                    const ids = selectedIds;
                    const result = wl.addToList(list.id, ids);
                    if (!readOnly) {
                      const moved = new Set(ids);
                      wl.reorderActiveList(activeList.items.filter((i) => !moved.has(i.id)));
                      wl.setSelectedIds([]);
                    }
                    wl.reportAdd(result, list.name);
                    setBulkAnchor(null);
                  }}
                >
                  {list.name}
                </MenuItem>
              ))}
            {bulkAnchor?.mode === "section" && [
              ...sections.map((section) => (
                <MenuItem key={section} sx={menuItemSx} onClick={() => { wl.setSection(selectedIds, section); setBulkAnchor(null); }}>
                  {section}
                </MenuItem>
              )),
              <MenuItem key="__none" sx={menuItemSx} onClick={() => { wl.setSection(selectedIds, null); setBulkAnchor(null); }}>
                Sin sección
              </MenuItem>,
              <MenuItem
                key="__new"
                sx={menuItemSx}
                onClick={() => {
                  const ids = selectedIds;
                  wl.setPrompt({ title: "Nueva sección", label: "Nombre de la sección", onSubmit: (name) => wl.setSection(ids, name) });
                  setBulkAnchor(null);
                }}
              >
                Nueva sección…
              </MenuItem>,
            ]}
          </Menu>

          {/* Flag filter (WL-27) */}
          <Menu anchorEl={flagAnchor} open={Boolean(flagAnchor)} onClose={() => setFlagAnchor(null)} slotProps={{ list: { dense: true } }}>
            {(["all", "any", "green", "yellow", "red", "blue"] as const).map((value) => (
              <MenuItem key={value} sx={menuItemSx} selected={wl.flagFilter === value} onClick={() => { wl.setFlagFilter(value); setFlagAnchor(null); }}>
                <ListItemIcon>
                  <FlagIcon sx={{ fontSize: 15, color: value === "all" || value === "any" ? "text.secondary" : flagColor[value] }} />
                </ListItemIcon>
                <ListItemText slotProps={{ primary: { sx: { fontSize: 12 } } }}>
                  {value === "all" ? "Todos" : value === "any" ? "Con cualquier marca" : `Marca ${flagLabel[value].toLowerCase()}`}
                </ListItemText>
              </MenuItem>
            ))}
          </Menu>

          {/* Column panel + templates (WL-08, WL-11, UI-17) */}
          <Menu anchorEl={templatesAnchor} open={Boolean(templatesAnchor)} onClose={() => setTemplatesAnchor(null)} slotProps={{ list: { dense: true } }}>
            <MenuItem
              sx={menuItemSx}
              onClick={() => {
                setTemplatesAnchor(null);
                adapter()?.openColumnsPanel();
              }}
            >
              Mostrar / ocultar columnas…
            </MenuItem>
            <Divider />
            <ListSubheader sx={{ lineHeight: "26px", fontSize: 11 }}>Plantillas</ListSubheader>
            {builtInTemplates.map((tpl) => (
              <MenuItem key={tpl.id} sx={menuItemSx} onClick={() => { wl.applyTemplate(tpl); setTemplatesAnchor(null); }}>
                {tpl.name}
              </MenuItem>
            ))}
            {wl.templates.length > 0 && <ListSubheader sx={{ lineHeight: "26px", fontSize: 11 }}>Mis plantillas</ListSubheader>}
            {wl.templates.map((tpl) => (
              <MenuItem key={tpl.id} sx={menuItemSx} onClick={() => { wl.applyTemplate(tpl); setTemplatesAnchor(null); }}>
                <ListItemText slotProps={{ primary: { sx: { fontSize: 12 } } }}>{tpl.name}</ListItemText>
                <IconButton
                  size="small"
                  edge="end"
                  aria-label={`Eliminar plantilla ${tpl.name}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    wl.deleteTemplate(tpl.id);
                  }}
                >
                  <DeleteIcon sx={{ fontSize: 14 }} />
                </IconButton>
              </MenuItem>
            ))}
            <Divider />
            <MenuItem
              sx={menuItemSx}
              onClick={() => {
                setTemplatesAnchor(null);
                wl.setPrompt({ title: "Guardar plantilla", label: "Nombre de la plantilla", onSubmit: wl.saveTemplate });
              }}
            >
              Guardar vista actual como plantilla…
            </MenuItem>
            <MenuItem
              sx={menuItemSx}
              onClick={() => {
                setTemplatesAnchor(null);
                wl.setConfirmReset(true);
              }}
            >
              Restaurar vista por defecto…
            </MenuItem>
          </Menu>

          {/* Settings */}
          <Menu anchorEl={menuAnchor} open={Boolean(menuAnchor)} onClose={() => setMenuAnchor(null)} slotProps={{ list: { dense: true }, paper: { sx: { maxHeight: 520 } } }}>
            <ListSubheader sx={{ lineHeight: "26px", fontSize: 11 }}>Vista</ListSubheader>
            {(
              [
                ["auto", "Automática (tarjetas si es angosto)"],
                ["table", "Tabla"],
                ["cards", "Tarjetas"],
              ] as const
            ).map(([value, label]) => (
              <MenuItem key={value} sx={menuItemSx} onClick={() => wl.setSettings((s) => ({ ...s, viewMode: value }))}>
                {check(settings.viewMode === value)}
                {label}
              </MenuItem>
            ))}
            <ListSubheader sx={{ lineHeight: "26px", fontSize: 11 }}>Densidad</ListSubheader>
            {(
              [
                ["compact", "Compacta"],
                ["standard", "Estándar"],
                ["comfortable", "Cómoda"],
              ] as const
            ).map(([value, label]) => (
              <MenuItem key={value} sx={menuItemSx} onClick={() => wl.setSettings((s) => ({ ...s, density: value }))}>
                {check(settings.density === value)}
                {label}
              </MenuItem>
            ))}
            <ListSubheader sx={{ lineHeight: "26px", fontSize: 11 }}>Flash de precio</ListSubheader>
            <MenuItem sx={{ ...menuItemSx, gap: 0.5, flexWrap: "wrap" }} disableRipple>
              {flashOptions.map((ms) => (
                <Chip
                  key={ms}
                  size="small"
                  label={ms === 0 ? "Off" : `${ms} ms`}
                  color={settings.flashMs === ms ? "primary" : "default"}
                  onClick={() => wl.setSettings((s) => ({ ...s, flashMs: ms }))}
                  sx={{ height: 20, fontSize: 10 }}
                />
              ))}
            </MenuItem>
            <Divider />
            <MenuItem sx={menuItemSx} onClick={() => { wl.setRulesOpen(true); setMenuAnchor(null); }}>
              Formato condicional…
            </MenuItem>
            <MenuItem sx={menuItemSx} onClick={() => { wl.setAlertTarget("list"); setMenuAnchor(null); }}>
              Alerta de lista…{wl.activeListAlert ? ` (±${wl.activeListAlert.thresholdPercent}%)` : ""}
            </MenuItem>
            <MenuItem sx={menuItemSx} onClick={() => { adapter()?.createCalculatedColumn(); setMenuAnchor(null); }}>
              Nueva columna calculada…
            </MenuItem>
            <MenuItem sx={menuItemSx} onClick={() => { wl.setSyntheticOpen(true); setMenuAnchor(null); }}>
              Nuevo instrumento sintético…
            </MenuItem>
            {settingsExtra}
            <Divider />
            <ListSubheader sx={{ lineHeight: "26px", fontSize: 11 }}>Simular estado (demo)</ListSubheader>
            {(Object.keys(demoStateLabel) as DemoState[]).map((state) => (
              <MenuItem key={state} sx={menuItemSx} onClick={() => setDemo(state)}>
                {check(demoState === state)}
                {demoStateLabel[state]}
              </MenuItem>
            ))}
          </Menu>

          {wl.ticket && (
            <OrderTicketDialog ticket={wl.ticket} onClose={() => wl.setTicket(null)} onResult={(r) => notify(r.severity, r.message)} />
          )}
          {alertTarget && (
            <AlertDialog
              target={alertTarget}
              existing={existingAlert}
              listAlertThreshold={wl.activeListAlert?.thresholdPercent ?? null}
              listName={activeList.name}
              onSave={(op, price) => alertTarget !== "list" && wl.savePriceAlert(alertTarget, op, price)}
              onDelete={() => alertTarget !== "list" && wl.deletePriceAlert(alertTarget.id)}
              onSaveListAlert={wl.saveListAlert}
              onClose={() => wl.setAlertTarget(null)}
            />
          )}
          <RulesDrawer open={wl.rulesOpen} rules={wl.rules} onChange={wl.setRules} onClose={() => wl.setRulesOpen(false)} />
          {wl.syntheticOpen && (
            <FormulaDialog
              mode="synthetic"
              sample={null}
              resolve={wl.resolve}
              onSubmit={wl.createSynthetic}
              onClose={() => wl.setSyntheticOpen(false)}
            />
          )}
          {wl.importOpen && <ImportDialog onImport={wl.importTickers} onClose={() => wl.setImportOpen(false)} />}
          {wl.prompt && (
            <PromptDialog
              open
              title={wl.prompt.title}
              label={wl.prompt.label}
              initialValue={wl.prompt.initial}
              onSubmit={wl.prompt.onSubmit}
              onClose={() => wl.setPrompt(null)}
            />
          )}
          <ConfirmDialog
            open={wl.confirmReset}
            title="Restaurar vista por defecto"
            message="Se restablecen columnas, orden, anchos, filtros, densidad, vista y formato condicional. Tus listas, marcas y alertas se conservan."
            confirmLabel="Restaurar"
            onConfirm={wl.resetView}
            onClose={() => wl.setConfirmReset(false)}
          />
        </OverlayContext.Provider>
      </WatchlistContext.Provider>
    </PanelWindow>
  );
}
