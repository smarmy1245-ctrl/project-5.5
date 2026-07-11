"use client"

import { useEffect } from "react"
import { ExternalLink, Gem, Trophy, X } from "lucide-react"
import type { Player, TitleRow } from "@/lib/data"
import {
  gamemodeIcon,
  nameMcUrl,
  overallRankBadge,
  tierLabel,
  titleForList,
  type Gamemode,
} from "@/lib/tiers"
import { PlayerSkin } from "./player-skin"
import { cn } from "@/lib/utils"

function tierTextClass(type: "HT" | "LT", tier: number): string {
  if (type === "HT") {
    if (tier === 1) return "text-amber-400"
    if (tier === 2) return "text-orange-400"
    return "text-red-400"
  }
  return "text-slate-300"
}

function TierIcon({ tier, type, icon }: { tier: number; type: "HT" | "LT"; icon: string }) {
  const Icon = gamemodeIcon(icon)
  return (
    <div className="flex flex-col items-center gap-1">
      <span
        className={cn(
          "flex h-11 w-11 items-center justify-center rounded-full border",
          type === "HT" ? "border-primary/50 bg-primary/15" : "border-border bg-secondary",
        )}
      >
        <Icon className="h-5 w-5 text-primary" aria-hidden="true" />
      </span>
      <span className={cn("font-mono text-xs font-bold tabular-nums", tierTextClass(type, tier))}>
        {tierLabel(tier, type)}
      </span>
    </div>
  )
}

export function PlayerProfileModal({
  player,
  rank,
  gamemodes,
  titles,
  onClose,
}: {
  player: Player
  rank: number | null
  gamemodes: Gamemode[]
  titles: TitleRow[]
  onClose: () => void
}) {
  const title = titleForList(player.totalPoints, titles)

  // Close on Escape.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose()
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [onClose])

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4"
      role="dialog"
      aria-modal="true"
      aria-label={`${player.username} profile`}
      onClick={onClose}
    >
      <div
        className="relative max-h-[88dvh] w-full max-w-md overflow-y-auto rounded-2xl border border-border bg-popover p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          aria-label="Close"
          className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-full bg-secondary text-muted-foreground transition-colors hover:text-foreground"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Identity */}
        <div className="flex flex-col items-center text-center">
          <PlayerSkin
            username={player.username}
            skinUrl={player.skinUrl}
            skinSource={player.skinSource}
            size={96}
            rounded="rounded-full"
            className="border-2 border-primary/60"
          />
          <h2 className="mt-3 text-2xl font-bold font-display text-foreground">{player.username}</h2>

          <span
            className={cn(
              "mt-2 inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-sm font-bold",
              title.className,
            )}
          >
            <Gem className="h-4 w-4" aria-hidden="true" />
            {title.name}
          </span>

          {player.region && (
            <p className="mt-2 text-sm font-semibold text-muted-foreground">{player.region}</p>
          )}

          {player.skinSource !== "upload" && player.skinSource !== "skin" && (
            <a
              href={nameMcUrl(player.username)}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-1.5 text-sm font-semibold text-muted-foreground transition-colors hover:text-foreground"
            >
              NameMC
              <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
            </a>
          )}
        </div>

        {/* Position */}
        <div className="mt-6">
          <p className="mb-2 text-sm font-bold uppercase tracking-wide text-muted-foreground">Position</p>
          <div className="flex items-center gap-3 rounded-xl border border-border bg-card p-3">
            <span
              className={cn(
                "flex h-10 min-w-12 items-center justify-center px-2 text-lg font-extrabold font-display tabular-nums",
                overallRankBadge(rank ?? 0),
              )}
              style={{ clipPath: "polygon(0 0, 100% 0, 82% 100%, 0 100%)", borderRadius: "0.5rem" }}
            >
              {rank ? `${rank}.` : "—"}
            </span>
            <Trophy className="h-5 w-5 text-amber-400" aria-hidden="true" />
            <span className="font-bold font-display text-foreground">
              OVERALL{" "}
              <span className="font-semibold text-muted-foreground">({player.totalPoints} points)</span>
            </span>
          </div>
        </div>

        {/* Tiers */}
        <div className="mt-5">
          <p className="mb-2 text-sm font-bold uppercase tracking-wide text-muted-foreground">Tiers</p>
          {player.tiers.length === 0 ? (
            <p className="rounded-xl border border-border bg-card p-4 text-center text-sm text-muted-foreground">
              No tiers yet.
            </p>
          ) : (
            <div className="flex flex-wrap gap-3 rounded-xl border border-border bg-card p-3">
              {gamemodes.map((gm) => {
                const t = player.tiers.find((x) => x.gamemode === gm.slug)
                if (!t) return null
                return <TierIcon key={gm.id} tier={t.tier} type={t.tierType} icon={gm.icon} />
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
