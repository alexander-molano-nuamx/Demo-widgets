"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { isAuthenticated } from "@/lib/mock-auth";

const ChooserScreen = dynamic(
  () => import("@/components/ChooserScreen").then((mod) => mod.ChooserScreen),
  { ssr: false },
);

function HomeGate() {
  const router = useRouter();
  const authed = isAuthenticated();

  useEffect(() => {
    if (!authed) {
      router.replace("/login");
    }
  }, [authed, router]);

  if (!authed) return null;

  return <ChooserScreen />;
}

// Reading localStorage in HomeGate makes its output depend on client-only state,
// so it must never be server-rendered — otherwise the server's guess (always
// "logged out") mismatches a real client session and React throws a hydration error.
export default dynamic(() => Promise.resolve(HomeGate), { ssr: false });
