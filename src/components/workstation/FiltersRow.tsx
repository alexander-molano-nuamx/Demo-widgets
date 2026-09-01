"use client";

import { useState } from "react";
import { Stack } from "@mui/material";
import { Select } from "@nuam/common-fe-lib-components";

const traderAreaOptions = [
  { value: "renta-variable", label: "Renta Variable" },
  { value: "renta-fija", label: "Renta Fija" },
  { value: "derivados", label: "Derivados" },
];

const marketOptions = [
  { value: "global", label: "Mercado Global" },
  { value: "local", label: "Mercado Local" },
];

const informationOptions = [
  { value: "resumen", label: "Resumen" },
  { value: "detalle", label: "Detalle" },
];

export function FiltersRow() {
  const [traderArea, setTraderArea] = useState(traderAreaOptions[0]);
  const [market, setMarket] = useState(marketOptions[0]);
  const [information, setInformation] = useState(informationOptions[0]);

  return (
    <Stack direction="row" spacing={2} sx={{ px: 2, py: 1.5 }}>
      <Select
        size="small"
        label="Trader Area"
        options={traderAreaOptions}
        value={traderArea}
        onChange={(value) => setTraderArea(value as typeof traderAreaOptions[number])}
        formControlProps={{ sx: { minWidth: 180 } }}
      />
      <Select
        size="small"
        label="Market"
        options={marketOptions}
        value={market}
        onChange={(value) => setMarket(value as typeof marketOptions[number])}
        formControlProps={{ sx: { minWidth: 180 } }}
      />
      <Select
        size="small"
        label="Information"
        options={informationOptions}
        value={information}
        onChange={(value) => setInformation(value as typeof informationOptions[number])}
        formControlProps={{ sx: { minWidth: 180 } }}
      />
    </Stack>
  );
}
