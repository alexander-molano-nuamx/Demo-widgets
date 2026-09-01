"use client";

import { useState } from "react";
import type { Location, NavigateFunction } from "react-router";
import { SideBar, DRAWER_WIDTH } from "@nuam/common-fe-lib-components";
import { menuPages } from "./menu-config";

export { DRAWER_WIDTH };

interface AppSideBarProps {
  open: boolean;
}

export function AppSideBar({ open }: AppSideBarProps) {
  const [activePath, setActivePath] = useState("/mercado/profundidad-de-mercado");

  const location = { pathname: activePath } as Location;
  const navigation = ((to: string) => setActivePath(to)) as NavigateFunction;

  return (
    <SideBar
      openSideBar={open}
      pages={menuPages}
      location={location}
      navigation={navigation}
    />
  );
}
