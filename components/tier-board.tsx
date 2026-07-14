"use client"

import { ChevronsUp, Trophy } from "lucide-react"
import type { Player } from "@/lib/data"
import { readableOn, type ThemeColors, type TierlistMode } from "@/lib/tiers"
import { PlayerSkin } from "./player-skin"
import { cn } from "@/lib/utils"

type Entry = { player: Player; type: "HT" | "LT"; points: number }

const COLUMNS = [1, 2, 3, 4, 5] as const

export function TierBoard({
  players,
  gamemode,
  mode,
  themeColors,
  onSelect,
}: {
  players: Player[]
  gamemode: string
  mode: TierlistMode
  themeColors: ThemeColors
  onSelect: (player: Player) => void
}) {
  // ----- Points mode: a single ranked list by raw points -----
  if (mode === "points") {
    const ranked = players
      .map((p) => ({ player: p, t: p.tiers.find((x) => x.gamemode === gamemode) }))
      .filter((x) => x.t)
      .sort((a, b) => b.t!.points - a.t!.points || a.player.username.localeCompare(b.player.username))

    if (ranked.length === 0) {
      return (
        <div className="rounded-xl border border-border bg-card p-8 text-center text-muted-foreground">
          No ranked players in this gamemode yet.
        </div>
      )
    }

    return (
      <ol className="grid grid-cols-1 gap-2 lg:grid-cols-2">
        {ranked.map(({ player, t }, i) => (
          <li key={player.id}>
            <button
              onClick={() => onSelect(player)}
              className="flex w-full items-center gap-3 rounded-xl border border-border bg-card px-3 py-2.5 text-left transition-colors hover:border-primary/60"
            >
              <span className="w-8 shrink-0 text-center font-display text-lg font-extrabold tabular-nums text-muted-foreground">
                {i + 1}
              </span>
              <PlayerSkin
                username={player.username}
                skinUrl={player.skinUrl}
                skinSource={player.skinSource}
                size={32}
                rounded="rounded-md"
                className="border border-border"
              />
              <span className="min-w-0 flex-1 truncate font-bold text-foreground">{player.username}</span>
              <span className="shrink-0 rounded-md bg-primary/15 px-2 py-1 font-mono text-sm font-bold text-primary">
                {t!.points} pts
              </span>
            </button>
          </li>
        ))}
      </ol>
    )
  }

  // ----- Tier mode: classic 5-column HT/LT board -----
  const buckets = new Map<number, Entry[]>()
  for (const p of players) {
    const t = p.tiers.find((x) => x.gamemode === gamemode)
    if (!t || t.tier < 1) continue
    const list = buckets.get(t.tier) ?? []
    list.push({ player: p, type: t.tierType, points: t.points })
    buckets.set(t.tier, list)
  }
  for (const list of buckets.values()) {
    list.sort((a, b) => b.points - a.points || a.player.username.localeCompare(b.player.username))
  }

  return (
    <div className="flex gap-3 overflow-x-auto pb-2 lg:overflow-x-visible">
      {COLUMNS.map((tier) => {
        const entries = buckets.get(tier) ?? []
        const bg = themeColors.tierColors[tier] ?? "#7f1d1d"
        const fg = readableOn(bg)
        return (
          <div key={tier} className="flex w-48 shrink-0 flex-col lg:w-auto lg:flex-1">
            <div
              className="flex items-center justify-center gap-2 rounded-t-xl border border-black/20 px-3 py-3 text-center"
              style={{ backgroundColor: bg, color: fg }}
            >
              <Trophy className="h-4 w-4 opacity-90" aria-hidden="true" />
              <span className="text-base font-bold font-display">{`Tier ${tier}`}</span>
            </div>

            <ol className="flex flex-1 flex-col gap-px rounded-b-xl border border-t-0 border-border bg-background/40 p-1">
              {entries.length === 0 ? (
                <li className="px-2 py-3 text-center text-xs text-muted-foreground">—</li>
              ) : (
                entries.map((e, i) => (
                  <li key={e.player.id}>
                    <button
                      onClick={() => onSelect(e.player)}
                      className={cn(
                        "flex w-full items-center gap-2 rounded-md px-2 py-2 text-left transition-colors hover:bg-primary/10",
                        i % 2 === 0 ? "bg-card" : "bg-secondary/40",
                      )}
                    >
                      <PlayerSkin
                        username={e.player.username}
                        skinUrl={e.player.skinUrl}
                        skinSource={e.player.skinSource}
                        size={24}
                        rounded="rounded"
                        className="border border-border"
                      />
                      <span className="min-w-0 flex-1 truncate text-sm font-semibold text-foreground">
                        {e.player.username}
                      </span>
                      <ChevronsUp
                        className="h-4 w-4 shrink-0"
                        style={{ color: e.type === "HT" ? themeColors.htColor : themeColors.ltColor }}
                        aria-hidden="true"
                      />
                    </button>
                  </li>
                ))
              )}
            </ol>
          </div>
        )
      })}
    </div>
  )
}
