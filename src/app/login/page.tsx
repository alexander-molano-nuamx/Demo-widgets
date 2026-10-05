"use client";

import dynamic from "next/dynamic";

// @nuam/common-fe-lib-components touches `document` as soon as it is imported (it injects the
// Roboto font stylesheet), so any page importing it must stay client-only: prerendering it on
// the server fails the build with "document is not defined".
export default dynamic(() => import("@/components/LoginScreen").then((mod) => mod.LoginScreen), { ssr: false });
