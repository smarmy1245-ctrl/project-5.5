"use client"

import { ChevronsUp, Trophy } from "lucide-react"
import type { Player } from "@/lib/data"
import { PlayerSkin } from "./player-skin"
import { cn } from "@/lib/utils"

type Entry = { player: Player; type: "HT" | "LT"; points: number }

const COLUMNS = [1, 2, 3, 4, 5] as const

export function TierBoard({
  players,
  gamemode,
  onSelect,
}: {
  players: Player[]
  gamemode: string
  onSelect: (player: Player) => void
}) {
  // Group players into tier buckets (1-5) for this gamemode.
  const buckets = new Map<number, Entry[]>()
  for (const p of players) {
    const t = p.tiers.find((x) => x.gamemode === gamemode)
    if (!t) continue
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
        return (
          <div key={tier} className="flex w-48 shrink-0 flex-col lg:w-auto lg:flex-1">
            <div
              className="flex items-center justify-center gap-2 rounded-t-xl border border-black/20 px-3 py-3 text-center"
              style={{
                backgroundColor: `var(--tier-${tier})`,
                color: `var(--tier-${tier}-fg)`,
              }}
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
                        className={cn(
                          "h-4 w-4 shrink-0",
                          e.type === "HT" ? "text-emerald-400" : "text-muted-foreground",
                        )}
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
