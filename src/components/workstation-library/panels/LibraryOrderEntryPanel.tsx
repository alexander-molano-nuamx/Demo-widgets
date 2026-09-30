"use client";

import { useState } from "react";
import styled from "styled-components";
import { Button, Checkbox, Select, Typography } from "@bvcco/bvc-digital-package-library";
import { LibraryTextInput } from "../LibrarySearchInput";
import { LibraryPanelWindow, type PanelWindowControls } from "./LibraryPanelWindow";

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

interface LibraryOrderEntryPanelProps extends PanelWindowControls {
  dragHandleClassName?: string;
}

const Row = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: flex-end;
  gap: 12px;
  row-gap: 14px;
`;

const Field = styled.div<{ $width?: number }>`
  display: flex;
  flex-direction: column;
  gap: 3px;
  width: ${({ $width }) => ($width ? `${$width}px` : "auto")};
`;

const FieldLabel = styled.span`
  font-size: 0.65rem;
  color: ${({ theme }) => theme.colors.font.disabled.normal};
`;

const Spacer = styled.div`
  flex: 1;
`;

const checkboxFontPropertys = { fontSize: "12px", fontWeight: "400" };

const ModeTab = styled.span<{ $active?: boolean }>`
  cursor: pointer;
  font-size: 0.75rem;
  font-weight: 700;
  color: ${({ theme, $active }) =>
    $active ? theme.colors.font.button.normal : theme.colors.font.disabled.normal};
`;

export function LibraryOrderEntryPanel({ dragHandleClassName, ...controls }: LibraryOrderEntryPanelProps) {
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
    <LibraryPanelWindow title="Ingreso de órdenes" dragHandleClassName={dragHandleClassName} {...controls}>
      <div style={{ padding: 16 }}>
        <Row>
          <Field $width={140}>
            <FieldLabel>Instrumento</FieldLabel>
            <Select
              options={instrumentOptions}
              value={instrument}
              onChange={(value: unknown) => setInstrument(value as typeof instrumentOptions[number])}
              isSearchable={false}
              maxSelectedItems={999}
            />
          </Field>
          <Field $width={120}>
            <FieldLabel>Tipo</FieldLabel>
            <Select
              options={orderTypeOptions}
              value={orderType}
              onChange={(value: unknown) => setOrderType(value as typeof orderTypeOptions[number])}
              isSearchable={false}
              maxSelectedItems={999}
            />
          </Field>
          <Field $width={120}>
            <FieldLabel>Vigencia</FieldLabel>
            <Select
              options={validityOptions}
              value={validity}
              onChange={(value: unknown) => setValidity(value as typeof validityOptions[number])}
              isSearchable={false}
              maxSelectedItems={999}
            />
          </Field>
          <Field $width={110}>
            <FieldLabel>Cantidad</FieldLabel>
            <LibraryTextInput type="number" value={quantity} onChange={(e) => setQuantity(Number(e.target.value))} />
          </Field>
          <Field $width={110}>
            <FieldLabel>Precio</FieldLabel>
            <LibraryTextInput type="number" value={price} onChange={(e) => setPrice(Number(e.target.value))} />
          </Field>
          <Field $width={130}>
            <FieldLabel>Cant. Iceberg</FieldLabel>
            <LibraryTextInput value={icebergQty} onChange={(e) => setIcebergQty(e.target.value)} />
          </Field>
          <Spacer />
          <div style={{ display: "flex", gap: 8 }}>
            <Button text="Comprar" backgroundColor="#73CF67" color="#FFFFFF" borderRadius="4px" onClick={() => {}} />
            <Button text="Vender" backgroundColor="#ED6C68" color="#FFFFFF" borderRadius="4px" onClick={() => {}} />
          </div>
        </Row>

        <Row style={{ marginTop: 20, alignItems: "center" }}>
          <div style={{ display: "flex", gap: 16 }}>
            <ModeTab $active={mode === "insertar"} onClick={() => setMode("insertar")}>INSERTAR</ModeTab>
            <ModeTab $active={mode === "modificar"} onClick={() => setMode("modificar")}>MODIFICAR</ModeTab>
          </div>
          <Field $width={150}>
            <FieldLabel>Cuenta / Fondo</FieldLabel>
            <LibraryTextInput />
          </Field>
          <Field $width={130}>
            <FieldLabel>Ref. Orden</FieldLabel>
            <LibraryTextInput value={refOrder} onChange={(e) => setRefOrder(e.target.value)} />
          </Field>
          <Field $width={110}>
            <FieldLabel>Cantidad min.</FieldLabel>
            <LibraryTextInput type="number" value={minQty} onChange={(e) => setMinQty(Number(e.target.value))} />
          </Field>
          <Checkbox text="Todo" isChecked={allQty} handleCheck={setAllQty} fontPropertys={checkboxFontPropertys} />
          <Button text="Enviar orden" backgroundColor="#FD441E" color="#FFFFFF" borderRadius="4px" onClick={() => {}} />
        </Row>

        <Row style={{ marginTop: 14 }}>
          <Checkbox text="Activar por sesión" isChecked={activateBySession} handleCheck={setActivateBySession} fontPropertys={checkboxFontPropertys} />
          <Checkbox text="Activar por precio" isChecked={activateByPrice} handleCheck={setActivateByPrice} fontPropertys={checkboxFontPropertys} />
        </Row>
      </div>
    </LibraryPanelWindow>
  );
}
