"use client";

import dynamic from "next/dynamic";

const Workstation = dynamic(
  () =>
    import("@/components/workstation/Workstation").then(
      (mod) => mod.Workstation,
    ),
  { ssr: false },
);

export default function Home() {
  return <Workstation />;
}
