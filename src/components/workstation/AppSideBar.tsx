"use client";

import { useState } from "react";
import type { Location, NavigateFunction } from "react-router";
import { SideBar, DRAWER_WIDTH } from "@nuam/common-fe-lib-components";
import { widgetPathMap } from "@/lib/widget-registry";
import { menuPages } from "./menu-config";
import type { WidgetWorkspace } from "./useWidgetWorkspace";

export { DRAWER_WIDTH };

interface AppSideBarProps {
  open: boolean;
  onOpenWidget: WidgetWorkspace["reopenWidget"];
}

export function AppSideBar({ open, onOpenWidget }: AppSideBarProps) {
  const [activePath, setActivePath] = useState("/mercado/profundidad-de-mercado");

  const location = { pathname: activePath } as Location;
  const navigation = ((to: string) => {
    setActivePath(to);
    const widgetId = widgetPathMap[to];
    if (widgetId) onOpenWidget(widgetId);
  }) as NavigateFunction;

  return (
    <SideBar
      openSideBar={open}
      pages={menuPages}
      location={location}
      navigation={navigation}
    />
  );
}
