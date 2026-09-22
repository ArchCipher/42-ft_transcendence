import Link from "next/link"

export function ExpiredGuestDocument() {
  return (
    <main className="grid min-h-screen place-items-center bg-[oklch(0.12_0.006_285)] px-6 font-mono text-[#f4f2ee]">
      <section className="max-w-lg border border-white/15 bg-white/5 p-7 text-center">
        <p className="text-xs uppercase tracking-[0.16em] text-white/50">Temporary document expired</p>
        <h1 className="mt-3 font-serif text-4xl tracking-tight">This writing session has ended.</h1>
        <p className="mt-4 text-sm leading-relaxed text-white/70">
          Temporary documents are deleted when their 35-minute session expires. Start a new document to keep writing.
        </p>
        <Link
          href="/sync"
          className="mt-6 inline-flex border border-white/25 px-4 py-2 text-xs transition-colors hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
        >
          Start a new document
        </Link>
      </section>
    </main>
  )
}
