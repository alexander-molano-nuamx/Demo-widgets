"use client";

import { Typography } from "@bvcco/bvc-digital-package-library";
import {
  instrumentRankingRows,
  participationRankingRows,
  type InstrumentRankingRow,
  type ParticipationRankingRow,
} from "@/lib/mock-data";
import { LibraryTable, type LibraryTableColumn } from "../LibraryTable";
import { LibraryPanelWindow, type PanelWindowControls } from "./LibraryPanelWindow";

const instrumentColumns: LibraryTableColumn<InstrumentRankingRow>[] = [
  { key: "instrumento", header: "Instrumento" },
  { key: "valor", header: "Valor", align: "right" },
];

const participationColumns: LibraryTableColumn<ParticipationRankingRow>[] = [
  { key: "corredora", header: "Corredora" },
  { key: "cantidad", header: "Cantidad", align: "right" },
];

interface LibraryRankingsPanelProps extends PanelWindowControls {
  dragHandleClassName?: string;
}

export function LibraryRankingsPanel({ dragHandleClassName, ...controls }: LibraryRankingsPanelProps) {
  return (
    <LibraryPanelWindow title="Rankings" dragHandleClassName={dragHandleClassName} {...controls}>
      <Typography type="caption" color="tertiary" colortype="normal" style={{ display: "block", padding: "6px 12px 0", fontWeight: 700 }}>
        Instrumentos - Renta variable
      </Typography>
      <LibraryTable
        columns={instrumentColumns}
        rows={instrumentRankingRows}
        rowKey={(row, index) => `${row.instrumento}-${index}`}
      />

      <Typography type="caption" color="tertiary" colortype="normal" style={{ display: "block", padding: "10px 12px 0", fontWeight: 700 }}>
        Participación - Renta variable
      </Typography>
      <LibraryTable
        columns={participationColumns}
        rows={participationRankingRows}
        rowKey={(row, index) => `${row.corredora}-${index}`}
      />
    </LibraryPanelWindow>
  );
}
