"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { isAuthenticated } from "@/lib/mock-auth";

const Workstation = dynamic(
  () =>
    import("@/components/workstation/Workstation").then(
      (mod) => mod.Workstation,
    ),
  { ssr: false },
);

function WorkstationGate() {
  const router = useRouter();
  const authed = isAuthenticated();

  useEffect(() => {
    if (!authed) {
      router.replace("/login");
    }
  }, [authed, router]);

  if (!authed) return null;

  return <Workstation />;
}

// isAuthenticated() reads localStorage, so this must stay client-only — server-rendering
// it would always guess "logged out" and mismatch a real client session on hydration.
export default dynamic(() => Promise.resolve(WorkstationGate), { ssr: false });
