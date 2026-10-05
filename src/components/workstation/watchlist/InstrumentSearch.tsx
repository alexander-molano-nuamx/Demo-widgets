"use client";

import { useEffect, useRef, useState } from "react";
import {
  Autocomplete,
  Box,
  Chip,
  CircularProgress,
  MenuItem,
  Select,
  Stack,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import { assetClassLabel, type AssetClass, type Country, type Instrument } from "@/lib/watchlist/model";

interface InstrumentSearchProps {
  instruments: Map<number, Instrument>;
  inList: Set<number>;
  disabled: boolean;
  disabledReason?: string;
  onAdd: (instrument: Instrument) => void;
}

const SEARCH_LATENCY_MS = 280;
const DEBOUNCE_MS = 200;
const MAX_RESULTS = 20;

/** Simulates the instrument-search service; in production this is an async API call. */
function searchInstruments(
  instruments: Map<number, Instrument>,
  query: string,
  markets: Country[],
  assetClass: AssetClass | "all",
  signal: AbortSignal,
) {
  return new Promise<Instrument[]>((resolve, reject) => {
    const timer = window.setTimeout(() => {
      const q = query.trim().toUpperCase();
      const results: Instrument[] = [];
      for (const inst of instruments.values()) {
        if (inst.syntheticExpression) continue;
        if (markets.length > 0 && !markets.includes(inst.country)) continue;
        if (assetClass !== "all" && inst.assetClass !== assetClass) continue;
        if (inst.orderbook.includes(q) || inst.description.toUpperCase().includes(q)) results.push(inst);
      }
      // Prefix matches on the ticker first.
      results.sort((a, b) => Number(b.orderbook.startsWith(q)) - Number(a.orderbook.startsWith(q)));
      resolve(results.slice(0, MAX_RESULTS));
    }, SEARCH_LATENCY_MS);
    signal.addEventListener("abort", () => {
      window.clearTimeout(timer);
      reject(new DOMException("aborted", "AbortError"));
    });
  });
}

/** Async autocomplete to add instruments, filterable by market and asset class (WL-02, UI-16). */
export function InstrumentSearch({ instruments, inList, disabled, disabledReason, onAdd }: InstrumentSearchProps) {
  const [input, setInput] = useState("");
  const [options, setOptions] = useState<Instrument[]>([]);
  const [loading, setLoading] = useState(false);
  const [markets, setMarkets] = useState<Country[]>([]);
  const [assetClass, setAssetClass] = useState<AssetClass | "all">("all");
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (input.trim().length < 1) return;
    const debounce = window.setTimeout(() => {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;
      searchInstruments(instruments, input, markets, assetClass, controller.signal)
        .then((results) => {
          setOptions(results);
          setLoading(false);
        })
        .catch((error: unknown) => {
          if (error instanceof DOMException && error.name === "AbortError") return;
          setLoading(false);
        });
    }, DEBOUNCE_MS);
    return () => window.clearTimeout(debounce);
  }, [input, markets, assetClass, instruments]);

  useEffect(() => () => abortRef.current?.abort(), []);

  return (
    <Stack direction="row" spacing={0.75} sx={{ alignItems: "center" }}>
      <Autocomplete<Instrument, false, false, false>
        size="small"
        disabled={disabled}
        options={options}
        loading={loading}
        value={null}
        inputValue={input}
        onInputChange={(_, value, reason) => {
          if (reason === "reset") return;
          setInput(value);
          setLoading(value.trim().length > 0);
          if (!value.trim()) setOptions([]);
        }}
        onChange={(_, value) => {
          if (value) {
            onAdd(value);
            setInput("");
            setOptions([]);
            setLoading(false);
          }
        }}
        filterOptions={(x) => x}
        getOptionLabel={(o) => o.orderbook}
        getOptionDisabled={(o) => inList.has(o.id)}
        isOptionEqualToValue={(a, b) => a.id === b.id}
        noOptionsText={input.trim() ? "Sin resultados" : "Escribe un nemotécnico o nombre"}
        loadingText="Buscando…"
        sx={{ width: 220 }}
        slotProps={{ popper: { sx: { minWidth: 360 } } }}
        renderOption={(props, option) => {
          const { key, ...rest } = props as typeof props & { key: string };
          return (
            <Box component="li" key={key} {...rest} sx={{ display: "flex", gap: 1, alignItems: "center", fontSize: 12 }}>
              <Typography variant="caption" sx={{ fontWeight: 700, minWidth: 96 }}>
                {option.orderbook}
              </Typography>
              <Typography variant="caption" noWrap sx={{ flex: 1, color: "text.secondary" }}>
                {option.description}
              </Typography>
              <Chip size="small" label={option.country} sx={{ height: 16, fontSize: 9 }} />
              <Chip size="small" variant="outlined" label={option.assetClass} sx={{ height: 16, fontSize: 9 }} />
              {inList.has(option.id) && (
                <Typography variant="caption" sx={{ color: "text.disabled" }}>
                  en la lista
                </Typography>
              )}
            </Box>
          );
        }}
        renderInput={(params) => (
          <TextField
            {...params}
            placeholder={disabled ? (disabledReason ?? "No disponible") : "Agregar instrumento…"}
            slotProps={{
              ...params.slotProps,
              input: {
                ...params.slotProps.input,
                startAdornment: <SearchIcon sx={{ fontSize: 14, color: "text.secondary", mr: 0.25 }} />,
                endAdornment: (
                  <>
                    {loading ? <CircularProgress color="inherit" size={12} /> : null}
                    {params.slotProps.input.endAdornment}
                  </>
                ),
                sx: { fontSize: 11, py: "0 !important" },
              },
              htmlInput: { ...params.slotProps.htmlInput, "aria-label": "Buscar instrumento para agregar" },
            }}
          />
        )}
      />
      <ToggleButtonGroup
        size="small"
        value={markets}
        onChange={(_, value: Country[]) => {
          setMarkets(value);
          setLoading(input.trim().length > 0);
        }}
        aria-label="Filtrar búsqueda por mercado"
        sx={{ "& .MuiToggleButton-root": { py: 0, px: 0.75, fontSize: 10, lineHeight: "20px" } }}
      >
        <ToggleButton value="CL">CL</ToggleButton>
        <ToggleButton value="PE">PE</ToggleButton>
        <ToggleButton value="CO">CO</ToggleButton>
      </ToggleButtonGroup>
      <Select
        size="small"
        value={assetClass}
        onChange={(e) => {
          setAssetClass(e.target.value as AssetClass | "all");
          setLoading(input.trim().length > 0);
        }}
        inputProps={{ "aria-label": "Filtrar búsqueda por clase de activo" }}
        sx={{ fontSize: 11, "& .MuiSelect-select": { py: 0.25 } }}
      >
        <MenuItem value="all" sx={{ fontSize: 12 }}>
          Todas las clases
        </MenuItem>
        {(Object.keys(assetClassLabel) as AssetClass[]).map((ac) => (
          <MenuItem key={ac} value={ac} sx={{ fontSize: 12 }}>
            {assetClassLabel[ac]}
          </MenuItem>
        ))}
      </Select>
    </Stack>
  );
}
