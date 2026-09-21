"use client";

import dynamic from "next/dynamic";

const SyncEditorPage = dynamic(
  () =>
    import("@/components/sync/sync-editor").then(
      (mod) => mod.SyncEditorPage
    ),
  { ssr: false }
);

export default function Page() {
  return <SyncEditorPage />;
}