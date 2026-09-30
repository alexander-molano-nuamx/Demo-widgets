"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { isAuthenticated } from "@/lib/mock-auth";

const LibraryWorkstation = dynamic(
  () =>
    import("@/components/workstation-library/LibraryWorkstation").then(
      (mod) => mod.LibraryWorkstation,
    ),
  { ssr: false },
);

export default function WorkstationLibraryPage() {
  const router = useRouter();
  const authed = isAuthenticated();

  useEffect(() => {
    if (!authed) {
      router.replace("/login");
    }
  }, [authed, router]);

  if (!authed) return null;

  return <LibraryWorkstation />;
}
