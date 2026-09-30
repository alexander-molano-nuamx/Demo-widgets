"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ThemeProvider } from "styled-components";
import { libraryTheme } from "@/lib/libraryTheme";
import { setAuthenticated } from "@/lib/mock-auth";
import { useWidgetWorkspace } from "@/components/workstation/useWidgetWorkspace";
import { LibraryTopBar } from "./LibraryTopBar";
import { LibrarySideBar, DRAWER_WIDTH } from "./LibrarySideBar";
import { LibraryTickerBar } from "./LibraryTickerBar";
import { LibraryFiltersRow } from "./LibraryFiltersRow";
import { LibraryGridWorkspace } from "./LibraryGridWorkspace";

export function LibraryWorkstation() {
  const router = useRouter();
  const [openSideBar, setOpenSideBar] = useState(false);
  const workspace = useWidgetWorkspace();

  const handleLogout = () => {
    setAuthenticated(false);
    router.replace("/login");
  };

  return (
    <ThemeProvider theme={libraryTheme}>
      <div
        style={{
          minHeight: "100vh",
          background: libraryTheme.colors.bg.background.normal,
          display: "flex",
          flexDirection: "column",
        }}
      >
        <LibraryTopBar onToggleSidebar={() => setOpenSideBar((v) => !v)} onLogout={handleLogout} />
        <LibrarySideBar open={openSideBar} onOpenWidget={workspace.reopenWidget} />
        <div
          style={{
            marginLeft: openSideBar ? DRAWER_WIDTH : 0,
            transition: "margin-left 195ms ease",
          }}
        >
          <LibraryTickerBar />
          <LibraryFiltersRow />
          <LibraryGridWorkspace {...workspace} />
        </div>
      </div>
    </ThemeProvider>
  );
}
