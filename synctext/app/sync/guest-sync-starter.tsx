"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import ErrorNote from "../components/form/ErrorNote";

export default function GuestSyncStarter() {
  const router = useRouter();
  const started = useRef(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (started.current) return;
    started.current = true;

    async function startGuestDocument() {
      try {
        const response = await fetch("/api/guest-documents", {
          method: "POST",
        });
        const document = (await response.json().catch(() => null)) as {
          id?: string;
        } | null;
        if (!response.ok || !document?.id)
          throw new Error("Could not start guest document");
        router.replace(`/doc/${encodeURIComponent(document.id)}`);
      } catch {
        setError(
          "We could not start your temporary document. Please try again.",
        );
      }
    }
    void startGuestDocument();
  }, [router]);

  return (
    <main className="grid min-h-screen place-items-center bg-[oklch(0.12_0.006_285)] px-6 font-mono text-sm text-[#f4f2ee]">
      {error ? (
        <div className="max-w-md space-y-4 text-center">
          <ErrorNote>{error}</ErrorNote>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="border border-white/25 px-4 py-2 transition-colors hover:bg-white/10"
          >
            Try again
          </button>
        </div>
      ) : (
        <p role="status">Preparing your writing space…</p>
      )}
    </main>
  );
}
