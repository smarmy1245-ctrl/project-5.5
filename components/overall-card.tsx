"use client"

import { Gem } from "lucide-react"
import type { Player, TitleRow } from "@/lib/data"
import { overallRankBadge, titleForList } from "@/lib/tiers"
import { PlayerSkin } from "./player-skin"
import { cn } from "@/lib/utils"

export function OverallCard({
  player,
  rank,
  titles,
  onSelect,
}: {
  player: Player
  rank: number
  titles: TitleRow[]
  onSelect: () => void
}) {
  const title = titleForList(player.totalPoints, titles)
  const top3 = rank <= 3

  return (
    <li
      className={cn(
        "overflow-hidden rounded-xl border bg-card transition-colors hover:border-primary/60",
        top3 ? "border-primary/40" : "border-border",
      )}
    >
      <button onClick={onSelect} className="flex w-full items-stretch text-left">
        {/* Diagonal rank tag + skin */}
        <div
          className={cn("flex items-center gap-2 py-3 pl-3 pr-6", overallRankBadge(rank))}
          style={{ clipPath: "polygon(0 0, 100% 0, 86% 100%, 0 100%)" }}
        >
          <span className="text-2xl font-extrabold font-display tabular-nums">{rank}.</span>
          <PlayerSkin
            username={player.username}
            skinUrl={player.skinUrl}
            skinSource={player.skinSource}
            variant="body"
            size={44}
            rounded="rounded-md"
            className="border border-black/20 bg-black/10"
          />
        </div>

        {/* Name + title */}
        <div className="flex min-w-0 flex-1 flex-col justify-center px-3 py-2">
          <p className="truncate text-xl font-bold font-display leading-tight text-foreground">
            {player.username}
          </p>
          <p className={cn("mt-0.5 flex items-center gap-1.5 text-sm font-bold", title.className)}>
            <Gem className="h-4 w-4 shrink-0" aria-hidden="true" />
            <span className="truncate">
              {title.name}{" "}
              <span className="font-semibold text-muted-foreground">({player.totalPoints} points)</span>
            </span>
          </p>
        </div>
      </button>
    </li>
  )
}
