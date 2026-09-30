"use client";

import styled from "styled-components";
import { Button, Typography } from "@bvcco/bvc-digital-package-library";

const Bar = styled.header`
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 56px;
  padding: 0 16px;
  flex-shrink: 0;
  background: ${({ theme }) => theme.colors.bg.tertiary.normal};
  border-bottom: 1px solid ${({ theme }) => theme.colors.border.tertiary.normal};
`;

const Left = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
`;

const MenuToggle = styled.button`
  display: inline-flex;
  flex-direction: column;
  justify-content: center;
  gap: 4px;
  width: 28px;
  height: 28px;
  border: none;
  background: transparent;
  cursor: pointer;
  padding: 0;

  span {
    display: block;
    height: 2px;
    background: ${({ theme }) => theme.colors.font.primary.normal};
    border-radius: 1px;
  }
`;

interface LibraryTopBarProps {
  onToggleSidebar: () => void;
  onLogout: () => void;
}

export function LibraryTopBar({ onToggleSidebar, onLogout }: LibraryTopBarProps) {
  return (
    <Bar>
      <Left>
        <MenuToggle onClick={onToggleSidebar} aria-label="Abrir menú">
          <span />
          <span />
          <span />
        </MenuToggle>
        <Typography type="h6" color="primary" colortype="normal" style={{ fontWeight: 700 }}>
          nuam TWS · Librería BVC
        </Typography>
      </Left>
      <Button text="Cerrar sesión" backgroundColor="transparent" color="#FFFFFF" borderRadius="4px" onClick={onLogout} />
    </Bar>
  );
}
