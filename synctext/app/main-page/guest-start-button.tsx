"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { ArrowUpRight } from "lucide-react"

import { buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"

type GuestStartButtonProps = {
  children: React.ReactNode
  variant?: "primary" | "outline"
  withArrow?: boolean
  className?: string
}

// Starts (or resumes) the browser's one temporary guest document. This must
// be a POST: the server creates the opaque guest session and writes its cookie.
export function GuestStartButton({
  children,
  variant = "primary",
  withArrow = false,
  className,
}: GuestStartButtonProps) {
  const router = useRouter()
  const [isStarting, setIsStarting] = useState(false)

  async function startGuestDocument() {
    if (isStarting) return

    setIsStarting(true)
    try {
      const response = await fetch("/api/guest-documents", { method: "POST" })
      if (!response.ok) throw new Error("Guest document creation failed")

      const document: { id: string } = await response.json()
      router.push(`/doc/${document.id}`)
    } catch {
      // A visible native error is preferable to silently dropping the CTA.
      // Keep the action retryable without introducing another global toast API.
      window.alert("We couldn't start a document. Please try again.")
    } finally {
      setIsStarting(false)
    }
  }

  return (
    <button
      type="button"
      onClick={() => void startGuestDocument()}
      disabled={isStarting}
      className={cn(
        buttonVariants({ variant: variant === "outline" ? "outline" : "default", size: "lg" }),
        "min-h-11 rounded-none px-5 font-mono text-xs tracking-tight focus-visible:ring-white/50 disabled:cursor-wait",
        variant === "outline"
          ? "border-white/15 bg-transparent text-[#f4f2ee] hover:border-white/45 hover:bg-white/5 hover:text-[#f4f2ee]"
          : "bg-[#f4f2ee] text-[#090909] hover:bg-white",
        className,
      )}
    >
      {isStarting ? "Opening…" : children}
      {withArrow ? <ArrowUpRight aria-hidden="true" data-icon="inline-end" /> : null}
    </button>
  )
}
