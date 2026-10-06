"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { isAuthenticated } from "@/lib/mock-auth";
import { readBenchConfig } from "@/lib/watchlist/benchmark";

const Workstation = dynamic(
  () =>
    import("@/components/workstation/Workstation").then(
      (mod) => mod.Workstation,
    ),
  { ssr: false },
);
const BenchHarness = dynamic(
  () => import("@/components/workstation/BenchHarness").then((mod) => mod.BenchHarness),
  { ssr: false },
);

function WorkstationGate() {
  const router = useRouter();
  const authed = isAuthenticated();
  const benchWidget = readBenchConfig()?.widget;

  useEffect(() => {
    if (!authed) {
      router.replace("/login");
    }
  }, [authed, router]);

  if (!authed) return null;

  // Performance benchmark: a single watchlist, isolated (see lib/watchlist/benchmark.ts).
  if (benchWidget) return <BenchHarness widget={benchWidget} />;

  return <Workstation />;
}

// isAuthenticated() reads localStorage, so this must stay client-only — server-rendering
// it would always guess "logged out" and mismatch a real client session on hydration.
export default dynamic(() => Promise.resolve(WorkstationGate), { ssr: false });
