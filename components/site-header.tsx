"use client"

import { useState } from "react"
import Link from "next/link"
import { Info, Shield, X } from "lucide-react"
import { POINTS, tierTextClass } from "@/lib/tiers"
import type { TitleRow } from "@/lib/data"
import { cn } from "@/lib/utils"

type ModalTab = "points" | "titles"

export function SiteHeader({ titles }: { titles: TitleRow[] }) {
  const [open, setOpen] = useState(false)
  const [modalTab, setModalTab] = useState<ModalTab>("points")

  return (
    <>
      <header className="sticky top-0 z-20 border-b border-border bg-background/85 backdrop-blur">
        <div className="mx-auto flex max-w-2xl items-center justify-between gap-3 px-4 py-3 lg:max-w-7xl lg:px-8">
          <img src="/smarmy-logo.png" alt="Smarmy Tiers" className="h-16 w-auto sm:h-20" />

          <div className="flex items-center gap-2">
            <button
              onClick={() => setOpen(true)}
              className="flex min-h-11 cursor-pointer items-center gap-2 rounded-lg border border-border bg-card px-3 text-sm font-bold text-muted-foreground transition-colors hover:text-foreground"
            >
              <Info className="h-4 w-4" aria-hidden="true" />
              Information
            </button>
            <Link
              href="/admin"
              className="flex min-h-11 cursor-pointer items-center gap-2 rounded-lg border border-border bg-card px-3 text-sm font-bold text-muted-foreground transition-colors hover:text-foreground"
            >
              <Shield className="h-4 w-4" aria-hidden="true" />
              <span className="hidden sm:inline">Admin</span>
            </Link>
          </div>
        </div>
      </header>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Ranking information"
          onClick={() => setOpen(false)}
        >
          <div
            className="max-h-[85dvh] w-full max-w-md overflow-y-auto rounded-2xl border border-border bg-popover p-5"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Tabs */}
            <div className="mb-4 flex items-center gap-2">
              <div className="flex flex-1 gap-2 rounded-xl border border-border bg-card p-1">
                <button
                  onClick={() => setModalTab("points")}
                  className={cn(
                    "flex-1 cursor-pointer rounded-lg px-4 py-2 text-sm font-bold tracking-wide transition-colors",
                    modalTab === "points"
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  POINTS
                </button>
                <button
                  onClick={() => setModalTab("titles")}
                  className={cn(
                    "flex-1 cursor-pointer rounded-lg px-4 py-2 text-sm font-bold tracking-wide transition-colors",
                    modalTab === "titles"
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  TITLES
                </button>
              </div>
              <button
                onClick={() => setOpen(false)}
                aria-label="Close"
                className="flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-md text-muted-foreground hover:text-foreground"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {modalTab === "points" ? (
              <div>
                <h2 className="mb-3 text-lg font-bold font-display text-foreground">
                  How ranking points are calculated
                </h2>
                <ul className="flex flex-col gap-2">
                  {Object.entries(POINTS).map(([tier, pts]) => (
                    <li
                      key={tier}
                      className="flex items-center justify-between rounded-lg border border-border bg-card px-4 py-3"
                    >
                      <span className={cn("font-bold font-display", tierTextClass(Number(tier)))}>
                        {`TIER ${tier}`}
                      </span>
                      <span className="flex items-center gap-4 font-mono text-sm">
                        <span className="text-rose-400">
                          HT <span className="font-bold text-foreground">{pts.HT}</span>
                        </span>
                        <span className="text-emerald-400">
                          LT <span className="font-bold text-foreground">{pts.LT}</span>
                        </span>
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : (
              <div>
                <h2 className="mb-3 text-lg font-bold font-display text-foreground">Titles by total points</h2>
                <ul className="flex flex-col gap-2">
                  {titles.map((t) => (
                    <li
                      key={t.id}
                      className="flex items-center justify-between rounded-lg border border-border bg-card px-4 py-3"
                    >
                      <span className={cn("font-bold font-display tracking-wide", t.className)}>{t.name}</span>
                      <span className="font-mono text-sm text-muted-foreground">
                        <span className="font-bold text-foreground">{t.min}</span>+ pts
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  )
}
