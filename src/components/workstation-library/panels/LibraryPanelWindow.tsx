"use client";

import { createPortal } from "react-dom";
import styled from "styled-components";
import { Typography } from "@bvcco/bvc-digital-package-library";
import type { ReactNode } from "react";

export interface PanelWindowControls {
  isMinimized?: boolean;
  isMaximized?: boolean;
  onToggleMinimize?: () => void;
  onToggleMaximize?: () => void;
  onClose?: () => void;
}

interface LibraryPanelWindowProps extends PanelWindowControls {
  title: string;
  headerExtra?: ReactNode;
  children: ReactNode;
  dragHandleClassName?: string;
}

const Frame = styled.div<{ $isMaximized?: boolean }>`
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
  border: 1px solid ${({ theme }) => theme.colors.border.tertiary.normal};
  border-radius: ${({ theme }) => theme.borderRadius.small};
  background: ${({ theme }) => theme.colors.bg.background.normal};
  ${({ $isMaximized }) =>
    $isMaximized &&
    `
      position: fixed;
      inset: 24px;
      z-index: 1300;
      box-shadow: 0 8px 24px rgba(0, 0, 0, 0.35);
    `}
`;

const Header = styled.div<{ $isMinimized?: boolean }>`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 4px 8px;
  flex-shrink: 0;
  background: ${({ theme }) => theme.colors.bg.tickerHeader.normal};
  border-bottom: ${({ $isMinimized }) => ($isMinimized ? "none" : "1px solid")};
  border-color: ${({ theme }) => theme.colors.border.tertiary.normal};
  cursor: grab;
`;

const Controls = styled.div`
  display: flex;
  align-items: center;
  gap: 4px;
`;

const IconBtn = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 18px;
  height: 18px;
  padding: 0;
  border: none;
  background: transparent;
  color: ${({ theme }) => theme.colors.font.primary.normal};
  cursor: pointer;
  border-radius: 3px;

  &:hover {
    background: ${({ theme }) => theme.colors.bg.tableHover.normal};
  }

  svg {
    width: 10px;
    height: 10px;
  }
`;

const Body = styled.div`
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  overflow: auto;
`;

const Backdrop = styled.div`
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.4);
  z-index: 1299;
`;

function MinusIcon() {
  return (
    <svg viewBox="0 0 12 12" fill="currentColor">
      <rect x="1" y="5.2" width="10" height="1.6" />
    </svg>
  );
}

function PlusIcon() {
  return (
    <svg viewBox="0 0 12 12" fill="currentColor">
      <rect x="1" y="5.2" width="10" height="1.6" />
      <rect x="5.2" y="1" width="1.6" height="10" />
    </svg>
  );
}

function SquareIcon() {
  return (
    <svg viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.4">
      <rect x="1.5" y="1.5" width="9" height="9" />
    </svg>
  );
}

function RestoreSquareIcon() {
  return (
    <svg viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.3">
      <rect x="1" y="3.5" width="7.5" height="7.5" />
      <rect x="3.5" y="1" width="7.5" height="7.5" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
      <line x1="1.5" y1="1.5" x2="10.5" y2="10.5" />
      <line x1="10.5" y1="1.5" x2="1.5" y2="10.5" />
    </svg>
  );
}

export function LibraryPanelWindow({
  title,
  headerExtra,
  children,
  dragHandleClassName,
  isMinimized,
  isMaximized,
  onToggleMinimize,
  onToggleMaximize,
  onClose,
}: LibraryPanelWindowProps) {
  const header = (
    <Header className={dragHandleClassName} $isMinimized={isMinimized}>
      <Typography type="caption" color="primary" colortype="normal" style={{ fontWeight: 700 }}>
        {title}
      </Typography>
      <Controls className="panel-no-drag" onMouseDown={(e) => e.stopPropagation()}>
        {headerExtra}
        <IconBtn onClick={onToggleMinimize} title={isMinimized ? "Restaurar" : "Minimizar"}>
          {isMinimized ? <PlusIcon /> : <MinusIcon />}
        </IconBtn>
        <IconBtn onClick={onToggleMaximize} title={isMaximized ? "Restaurar" : "Maximizar"}>
          {isMaximized ? <RestoreSquareIcon /> : <SquareIcon />}
        </IconBtn>
        <IconBtn onClick={onClose} title="Cerrar">
          <CloseIcon />
        </IconBtn>
      </Controls>
    </Header>
  );

  const frame = (
    <Frame $isMaximized={isMaximized}>
      {header}
      {!isMinimized && <Body>{children}</Body>}
    </Frame>
  );

  if (isMaximized && typeof document !== "undefined") {
    return createPortal(
      <>
        <Backdrop onClick={onToggleMaximize} />
        {frame}
      </>,
      document.body,
    );
  }

  return frame;
}
