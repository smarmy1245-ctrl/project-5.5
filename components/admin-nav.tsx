"use client"

import { useEffect, useRef, useState } from "react"
import { ChevronDown } from "lucide-react"
import { cn } from "@/lib/utils"

export type AdminSection = { id: string; label: string }

// A compact dropdown of every admin control so the admin can jump straight to a
// section instead of scrolling. Works with mouse + keyboard on desktop.
export function AdminNav({ sections }: { sections: AdminSection[] }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false)
    }
    document.addEventListener("mousedown", onDocClick)
    document.addEventListener("keydown", onKey)
    return () => {
      document.removeEventListener("mousedown", onDocClick)
      document.removeEventListener("keydown", onKey)
    }
  }, [])

  function jump(id: string) {
    setOpen(false)
    const el = document.getElementById(id)
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" })
  }

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        className="flex min-h-11 w-full cursor-pointer items-center justify-between gap-2 rounded-lg border border-border bg-card px-3 text-sm font-bold text-foreground transition-colors hover:border-primary sm:w-56"
      >
        Jump to control
        <ChevronDown className={cn("h-4 w-4 transition-transform", open && "rotate-180")} aria-hidden="true" />
      </button>

      {open && (
        <div
          role="menu"
          className="absolute left-0 right-0 top-[calc(100%+0.5rem)] z-30 max-h-[60dvh] overflow-y-auto rounded-xl border border-border bg-popover p-1 shadow-xl sm:right-auto sm:w-56"
        >
          {sections.map((s) => (
            <button
              key={s.id}
              role="menuitem"
              type="button"
              onClick={() => jump(s.id)}
              className="flex w-full cursor-pointer items-center rounded-lg px-3 py-2 text-left text-sm font-semibold text-muted-foreground transition-colors hover:bg-card hover:text-foreground"
            >
              {s.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
