import type { Metadata } from "next";
import { SimpleEditor } from "@/components/tiptap-templates/simple/simple-editor"

export const metadata: Metadata = { title: "Editor" };

export default function Page() {
  return <SimpleEditor />
}
