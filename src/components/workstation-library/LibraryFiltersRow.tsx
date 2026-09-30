"use client";

import { useState } from "react";
import { Select } from "@bvcco/bvc-digital-package-library";

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

export function LibraryFiltersRow() {
  const [traderArea, setTraderArea] = useState(traderAreaOptions[0]);
  const [market, setMarket] = useState(marketOptions[0]);
  const [information, setInformation] = useState(informationOptions[0]);

  return (
    <div style={{ display: "flex", gap: 16, padding: "12px 16px" }}>
      <div style={{ minWidth: 180, fontSize: "0.75rem" }}>
        <Select
          options={traderAreaOptions}
          value={traderArea}
          onChange={(value: unknown) => setTraderArea(value as (typeof traderAreaOptions)[number])}
          isSearchable={false}
          maxSelectedItems={999}
        />
      </div>
      <div style={{ minWidth: 180, fontSize: "0.75rem" }}>
        <Select
          options={marketOptions}
          value={market}
          onChange={(value: unknown) => setMarket(value as (typeof marketOptions)[number])}
          isSearchable={false}
          maxSelectedItems={999}
        />
      </div>
      <div style={{ minWidth: 180, fontSize: "0.75rem" }}>
        <Select
          options={informationOptions}
          value={information}
          onChange={(value: unknown) => setInformation(value as (typeof informationOptions)[number])}
          isSearchable={false}
          maxSelectedItems={999}
        />
      </div>
    </div>
  );
}
