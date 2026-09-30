"use client";

import styled from "styled-components";
import { Typography } from "@bvcco/bvc-digital-package-library";
import { widgetPathMap } from "@/lib/widget-registry";
import type { WidgetWorkspace } from "@/components/workstation/useWidgetWorkspace";

export const DRAWER_WIDTH = 240;

const menuSections = [
  {
    title: "Área de negociación",
    items: [
      { name: "Ingreso de órdenes", path: "/area-negociacion/ingreso-de-ordenes" },
      { name: "Mensajes", path: "/area-negociacion/mensajes" },
    ],
  },
  {
    title: "Mercado",
    items: [
      { name: "Profundidad de mercado", path: "/mercado/profundidad-de-mercado" },
      { name: "Gráficos", path: "/mercado/graficos" },
      { name: "Watchlist", path: "/mercado/watchlist" },
      { name: "Rankings", path: "/mercado/rankings" },
    ],
  },
];

interface LibrarySideBarProps {
  open: boolean;
  onOpenWidget: WidgetWorkspace["reopenWidget"];
}

const Drawer = styled.nav<{ $open: boolean }>`
  position: fixed;
  top: 56px;
  left: 0;
  bottom: 0;
  width: ${DRAWER_WIDTH}px;
  transform: translateX(${({ $open }) => ($open ? "0" : `-${DRAWER_WIDTH}px`)});
  transition: transform 195ms ease;
  background: ${({ theme }) => theme.colors.bg.background.normal};
  border-right: 1px solid ${({ theme }) => theme.colors.border.tertiary.normal};
  overflow-y: auto;
  z-index: 10;
  padding: 12px 0;
`;

const SectionTitle = styled.div`
  padding: 8px 16px 4px;
`;

const Item = styled.button`
  display: block;
  width: 100%;
  text-align: left;
  padding: 6px 16px 6px 24px;
  border: none;
  background: transparent;
  cursor: pointer;

  &:hover {
    background: ${({ theme }) => theme.colors.bg.tableHover.normal};
  }
`;

export function LibrarySideBar({ open, onOpenWidget }: LibrarySideBarProps) {
  return (
    <Drawer $open={open}>
      {menuSections.map((section) => (
        <div key={section.title}>
          <SectionTitle>
            <Typography type="caption" color="disabled" colortype="dark" style={{ fontWeight: 700 }}>
              {section.title.toUpperCase()}
            </Typography>
          </SectionTitle>
          {section.items.map((item) => (
            <Item
              key={item.path}
              onClick={() => {
                const widgetId = widgetPathMap[item.path];
                if (widgetId) onOpenWidget(widgetId);
              }}
            >
              <Typography type="paragraph3" color="tertiary" colortype="normal">
                {item.name}
              </Typography>
            </Item>
          ))}
        </div>
      ))}
    </Drawer>
  );
}
