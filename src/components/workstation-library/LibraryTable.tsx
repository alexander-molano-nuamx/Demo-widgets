"use client";

import styled from "styled-components";
import type { ReactNode } from "react";

export interface LibraryTableColumn<T> {
  key: string;
  header: string;
  align?: "left" | "right" | "center";
  render?: (row: T) => ReactNode;
  width?: string;
}

interface LibraryTableProps<T> {
  columns: LibraryTableColumn<T>[];
  rows: T[];
  rowKey: (row: T, index: number) => string | number;
}

const Wrapper = styled.div`
  width: 100%;
  overflow: auto;
`;

const Table = styled.table`
  width: 100%;
  border-collapse: collapse;
  font-family: ${({ theme }) => theme.font.family.primary};
`;

const Th = styled.th<{ $align?: string }>`
  position: sticky;
  top: 0;
  text-align: ${({ $align }) => $align || "left"};
  font-size: 0.65rem;
  font-weight: 700;
  padding: 4px 8px;
  color: ${({ theme }) => theme.colors.font.tertiary.normal};
  background: ${({ theme }) => theme.colors.bg.tableHeader.normal};
  border-bottom: 1px solid ${({ theme }) => theme.colors.border.tertiary.normal};
  white-space: nowrap;
`;

const Td = styled.td<{ $align?: string }>`
  text-align: ${({ $align }) => $align || "left"};
  font-size: 0.7rem;
  padding: 3px 8px;
  color: ${({ theme }) => theme.colors.font.tertiary.normal};
  border-bottom: 1px solid ${({ theme }) => theme.colors.border.tertiary.normal};
  white-space: nowrap;
`;

const Row = styled.tr`
  &:hover td {
    background: ${({ theme }) => theme.colors.bg.tableHover.normal};
  }
`;

export function LibraryTable<T>({ columns, rows, rowKey }: LibraryTableProps<T>) {
  return (
    <Wrapper>
      <Table>
        <thead>
          <tr>
            {columns.map((col) => (
              <Th key={col.key} $align={col.align} style={{ width: col.width }}>
                {col.header}
              </Th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <Row key={rowKey(row, index)}>
              {columns.map((col) => (
                <Td key={col.key} $align={col.align}>
                  {col.render ? col.render(row) : String((row as Record<string, unknown>)[col.key] ?? "")}
                </Td>
              ))}
            </Row>
          ))}
        </tbody>
      </Table>
    </Wrapper>
  );
}
