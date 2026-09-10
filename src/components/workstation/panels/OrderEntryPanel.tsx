"use client";

import { useState } from "react";
import { Box, Stack } from "@mui/material";
import { Button, Checkbox, Select, TextField, Typography } from "@nuam/common-fe-lib-components";
import { PanelWindow, type PanelWindowControls } from "./PanelWindow";

const instrumentOptions = [
  { value: "ccu", label: "CCU" },
  { value: "copec", label: "COPEC" },
  { value: "falabella", label: "Falabella" },
];

const orderTypeOptions = [
  { value: "limite", label: "Limite" },
  { value: "mercado", label: "Mercado" },
];

const validityOptions = [
  { value: "diaria", label: "Diaria" },
  { value: "hasta-cancelar", label: "Hasta cancelar" },
];

interface OrderEntryPanelProps extends PanelWindowControls {
  dragHandleClassName?: string;
}

export function OrderEntryPanel({ dragHandleClassName, ...controls }: OrderEntryPanelProps) {
  const [mode, setMode] = useState<"insertar" | "modificar">("insertar");
  const [instrument, setInstrument] = useState(instrumentOptions[0]);
  const [orderType, setOrderType] = useState(orderTypeOptions[0]);
  const [validity, setValidity] = useState(validityOptions[0]);
  const [quantity, setQuantity] = useState(1000);
  const [price, setPrice] = useState(6750);
  const [icebergQty, setIcebergQty] = useState("");
  const [refOrder, setRefOrder] = useState("11028479");
  const [minQty, setMinQty] = useState(50);
  const [allQty, setAllQty] = useState(true);
  const [activateBySession, setActivateBySession] = useState(false);
  const [activateByPrice, setActivateByPrice] = useState(false);

  return (
    <PanelWindow title="Ingreso de órdenes" dragHandleClassName={dragHandleClassName} {...controls}>
      <Box sx={{ p: 2 }}>
        <Stack direction="row" spacing={2} sx={{ flexWrap: "wrap", rowGap: 2 }}>
          <Select
            size="small"
            label="Instrumento"
            options={instrumentOptions}
            value={instrument}
            onChange={(value) => setInstrument(value as typeof instrumentOptions[number])}
            formControlProps={{ sx: { minWidth: 140 } }}
          />
          <Select
            size="small"
            label="Tipo"
            options={orderTypeOptions}
            value={orderType}
            onChange={(value) => setOrderType(value as typeof orderTypeOptions[number])}
            formControlProps={{ sx: { minWidth: 120 } }}
          />
          <Select
            size="small"
            label="Vigencia"
            options={validityOptions}
            value={validity}
            onChange={(value) => setValidity(value as typeof validityOptions[number])}
            formControlProps={{ sx: { minWidth: 120 } }}
          />
          <TextField
            size="small"
            type="number"
            label="Cantidad"
            value={quantity}
            onChange={(value) => setQuantity(Number(value))}
            sx={{ minWidth: 120 }}
          />
          <TextField
            size="small"
            type="number"
            label="Precio"
            value={price}
            onChange={(value) => setPrice(Number(value))}
            sx={{ minWidth: 120 }}
          />
          <TextField
            size="small"
            label="Cant. Iceberg"
            value={icebergQty}
            onChange={(value) => setIcebergQty(String(value))}
            sx={{ minWidth: 140 }}
          />
          <Box sx={{ flex: 1 }} />
          <Stack direction="row" spacing={1}>
            <Button variant="contained" color="success" onClick={() => {}}>
              Comprar
            </Button>
            <Button variant="contained" color="error" onClick={() => {}}>
              Vender
            </Button>
          </Stack>
        </Stack>

        <Stack
          direction="row"
          spacing={2}
          sx={{ alignItems: "center", flexWrap: "wrap", rowGap: 1.5, mt: 2.5 }}
        >
          <Stack direction="row" spacing={2}>
            <Typography
              variant="body2"
              onClick={() => setMode("insertar")}
              sx={{
                cursor: "pointer",
                fontWeight: 700,
                color: mode === "insertar" ? "primary.main" : "text.secondary",
              }}
            >
              INSERTAR
            </Typography>
            <Typography
              variant="body2"
              onClick={() => setMode("modificar")}
              sx={{
                cursor: "pointer",
                fontWeight: 700,
                color: mode === "modificar" ? "primary.main" : "text.secondary",
              }}
            >
              MODIFICAR
            </Typography>
          </Stack>
          <TextField size="small" label="Cuenta / Fondo" sx={{ minWidth: 160 }} />
          <TextField
            size="small"
            label="Ref. Orden"
            value={refOrder}
            onChange={(value) => setRefOrder(String(value))}
            sx={{ minWidth: 140 }}
          />
          <TextField
            size="small"
            type="number"
            label="Cantidad min."
            value={minQty}
            onChange={(value) => setMinQty(Number(value))}
            sx={{ minWidth: 120 }}
          />
          <Checkbox
            label="Todo"
            checked={allQty}
            onChange={(_, checked) => setAllQty(checked)}
          />
          <Button variant="contained" color="primary" onClick={() => {}}>
            Enviar orden
          </Button>
        </Stack>

        <Stack direction="row" spacing={3} sx={{ mt: 1.5 }}>
          <Checkbox
            label="Activar por sesión"
            checked={activateBySession}
            onChange={(_, checked) => setActivateBySession(checked)}
          />
          <Checkbox
            label="Activar por precio"
            checked={activateByPrice}
            onChange={(_, checked) => setActivateByPrice(checked)}
          />
        </Stack>
      </Box>
    </PanelWindow>
  );
}
