"use client";

import { useState } from "react";
import { Box, useMediaQuery, useTheme } from "@mui/material";
import {
  NuamThemeWrapper,
  AppBar,
  HEADER_HEIGHT,
  CalendarButton,
  NotificationButton,
  LanguageButton,
  SwitchThemeButton,
  UserButton,
} from "@nuam/common-fe-lib-components";
import { TickerBar } from "./TickerBar";
import { FiltersRow } from "./FiltersRow";
import { GridWorkspace } from "./GridWorkspace";
import { AppSideBar, DRAWER_WIDTH } from "./AppSideBar";

export function Workstation() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));
  const [openSideBar, setOpenSideBar] = useState(false);

  return (
    <NuamThemeWrapper>
      <Box
        sx={{
          minHeight: "100vh",
          bgcolor: "background.default",
          display: "flex",
          flexDirection: "column",
        }}
      >
        <AppBar
          appTitle={isMobile ? "" : "nuam TWS"}
          toggleSidebar={() => setOpenSideBar(!openSideBar)}
          useIsotypeName={!isMobile}
          isotypeNameProps={{
            projectName: "nuam",
            logoSrc: "/nuam-isotype.svg",
            variant: "horizontal",
            showText: true,
          }}
          rightSideComponents={
            <>
              <CalendarButton />
              <NotificationButton onClick={() => alert("Notificaciones")} />
              <LanguageButton onClick={() => alert("Cambiar idioma")} />
              <SwitchThemeButton />
              <UserButton onClick={() => alert("Perfil de usuario")} />
            </>
          }
        />

        <AppSideBar open={openSideBar} />

        <Box
          sx={{
            mt: `${HEADER_HEIGHT}px`,
            ml: openSideBar ? `${DRAWER_WIDTH}px` : 0,
            transition: theme.transitions.create("margin-left", {
              easing: theme.transitions.easing.sharp,
              duration: theme.transitions.duration.leavingScreen,
            }),
          }}
        >
          <TickerBar />
          <FiltersRow />
          <GridWorkspace />
        </Box>
      </Box>
    </NuamThemeWrapper>
  );
}
