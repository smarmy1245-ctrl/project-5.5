"use client"

import { useMemo, useState } from "react"
import { Layers, Search, Trophy, X } from "lucide-react"
import type { Player, TitleRow } from "@/lib/data"
import { gamemodeIcon, titleForList, type Gamemode, type Tierlist } from "@/lib/tiers"
import { OverallCard } from "./overall-card"
import { TierBoard } from "./tier-board"
import { PlayerProfileModal } from "./player-profile-modal"
import { PlayerSkin } from "./player-skin"
import { cn } from "@/lib/utils"

// Restrict a player to a single tier list: keep only the tiers that belong to
// that list's gamemodes and recompute the point total from just those tiers.
// This keeps each tier list's points completely independent.
function scopePlayer(p: Player, slugs: Set<string>): Player {
  const tiers = p.tiers.filter((t) => slugs.has(t.gamemode))
  const totalPoints = tiers.reduce((sum, t) => sum + t.points, 0)
  return { ...p, tiers, totalPoints }
}

export function Leaderboard({
  tierlists,
  gamemodes,
  players,
  titles,
}: {
  tierlists: Tierlist[]
  gamemodes: Gamemode[]
  players: Player[]
  titles: TitleRow[]
}) {
  const [activeTierlistId, setActiveTierlistId] = useState<number>(tierlists[0]?.id ?? 0)
  const [tab, setTab] = useState<string>("all")
  const [selected, setSelected] = useState<Player | null>(null)
  const [searchOpen, setSearchOpen] = useState(false)
  const [q, setQ] = useState("")

  // Gamemodes that belong to the active tier list.
  const activeGamemodes = useMemo(
    () => gamemodes.filter((gm) => gm.tierlistId === activeTierlistId),
    [gamemodes, activeTierlistId],
  )
  const activeSlugs = useMemo(() => new Set(activeGamemodes.map((gm) => gm.slug)), [activeGamemodes])

  // Every player scoped to the active tier list (independent point totals).
  const scopedPlayers = useMemo(
    () => players.map((p) => scopePlayer(p, activeSlugs)),
    [players, activeSlugs],
  )

  // Combined "Overall" ranking within this tier list only.
  const all = useMemo(
    () =>
      scopedPlayers
        .filter((p) => p.totalPoints > 0)
        .sort((a, b) => b.totalPoints - a.totalPoints || a.username.localeCompare(b.username)),
    [scopedPlayers],
  )

  // Map username -> overall rank (based on this tier list's "all" ranking).
  const rankByUsername = useMemo(() => {
    const m = new Map<string, number>()
    all.forEach((p, i) => m.set(p.username, i + 1))
    return m
  }, [all])

  const scopedByUsername = useMemo(() => {
    const m = new Map<string, Player>()
    scopedPlayers.forEach((p) => m.set(p.username, p))
    return m
  }, [scopedPlayers])

  const results = useMemo(() => {
    const term = q.trim().toLowerCase()
    const list = term
      ? scopedPlayers.filter((p) => p.username.toLowerCase().includes(term))
      : [...scopedPlayers].sort((a, b) => b.totalPoints - a.totalPoints)
    return list.slice(0, 40)
  }, [q, scopedPlayers])

  function switchTierlist(id: number) {
    setActiveTierlistId(id)
    setTab("all")
  }

  function openProfile(p: Player) {
    // Always show the scoped version so the profile reflects the active list.
    setSelected(scopedByUsername.get(p.username) ?? p)
    setSearchOpen(false)
  }

  return (
    <section aria-label="Tier rankings">
      {/* Tier list switcher — each list is its own independent board */}
      {tierlists.length > 0 && (
        <div
          className="mb-5 flex gap-2 overflow-x-auto pb-1"
          role="tablist"
          aria-label="Tier lists"
        >
          {tierlists.map((tl) => {
            const active = tl.id === activeTierlistId
            return (
              <button
                key={tl.id}
                role="tab"
                aria-selected={active}
                onClick={() => switchTierlist(tl.id)}
                className={cn(
                  "flex min-h-12 shrink-0 cursor-pointer items-center gap-2 rounded-xl border px-5 text-base font-bold font-display transition-colors",
                  active
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-card text-muted-foreground hover:text-foreground",
                )}
              >
                <Layers className="h-4 w-4" aria-hidden="true" />
                {tl.label}
              </button>
            )
          })}
        </div>
      )}

      {/* Search players */}
      <button
        onClick={() => setSearchOpen(true)}
        className="mb-4 flex min-h-11 w-full cursor-pointer items-center gap-2 rounded-xl border border-border bg-card px-4 text-sm font-semibold text-muted-foreground transition-colors hover:text-foreground"
      >
        <Search className="h-4 w-4" aria-hidden="true" />
        Search players...
      </button>

      <div className="mb-5 flex gap-2 overflow-x-auto pb-1" role="tablist" aria-label="Gamemodes">
        <button
          role="tab"
          aria-selected={tab === "all"}
          onClick={() => setTab("all")}
          className={cn(
            "flex min-h-11 shrink-0 cursor-pointer items-center gap-2 rounded-lg border px-4 text-sm font-bold transition-colors",
            tab === "all"
              ? "border-primary bg-primary/15 text-primary"
              : "border-border bg-card text-muted-foreground hover:text-foreground",
          )}
        >
          <Trophy className="h-4 w-4" aria-hidden="true" />
          Overall
        </button>

        {activeGamemodes.map((gm) => {
          const active = tab === gm.slug
          const Icon = gamemodeIcon(gm.icon)
          return (
            <button
              key={gm.id}
              role="tab"
              aria-selected={active}
              onClick={() => setTab(gm.slug)}
              className={cn(
                "flex min-h-11 shrink-0 cursor-pointer items-center gap-2 rounded-lg border px-4 text-sm font-bold transition-colors",
                active
                  ? "border-primary bg-primary/15 text-primary"
                  : "border-border bg-card text-muted-foreground hover:text-foreground",
              )}
            >
              <Icon className="h-4 w-4" aria-hidden="true" />
              {gm.label}
            </button>
          )
        })}
      </div>

      {activeGamemodes.length === 0 ? (
        <EmptyState label="No gamemodes in this tier list yet." />
      ) : tab === "all" ? (
        all.length === 0 ? (
          <EmptyState />
        ) : (
          <ol className="grid grid-cols-1 gap-3 lg:grid-cols-2">
            {all.map((p, i) => (
              <OverallCard
                key={p.id}
                player={p}
                rank={i + 1}
                titles={titles}
                onSelect={() => openProfile(p)}
              />
            ))}
          </ol>
        )
      ) : (
        <TierBoard players={scopedPlayers} gamemode={tab} onSelect={openProfile} />
      )}

      {searchOpen && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center bg-black/75 p-4 pt-[10dvh]"
          role="dialog"
          aria-modal="true"
          aria-label="Search players"
          onClick={() => setSearchOpen(false)}
        >
          <div
            className="w-full max-w-md overflow-hidden rounded-2xl border border-border bg-popover"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-2 border-b border-border p-3">
              <Search className="h-5 w-5 shrink-0 text-muted-foreground" aria-hidden="true" />
              {/* eslint-disable-next-line jsx-a11y/no-autofocus */}
              <input
                autoFocus
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search a player..."
                className="min-h-9 flex-1 bg-transparent text-base text-foreground outline-none placeholder:text-muted-foreground"
              />
              <button
                onClick={() => setSearchOpen(false)}
                aria-label="Close search"
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:text-foreground"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <ul className="max-h-[60dvh] overflow-y-auto p-2">
              {results.length === 0 ? (
                <li className="p-4 text-center text-sm text-muted-foreground">No players found.</li>
              ) : (
                results.map((p) => {
                  const title = titleForList(p.totalPoints, titles)
                  const rank = rankByUsername.get(p.username)
                  return (
                    <li key={p.id}>
                      <button
                        onClick={() => openProfile(p)}
                        className="flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left transition-colors hover:bg-card"
                      >
                        <PlayerSkin
                          username={p.username}
                          skinUrl={p.skinUrl}
                          skinSource={p.skinSource}
                          size={36}
                          rounded="rounded-md"
                          className="border border-border"
                        />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate font-bold text-foreground">{p.username}</span>
                          <span className={cn("block truncate text-xs font-semibold", title.className)}>
                            {title.name} · {p.totalPoints} pts
                          </span>
                        </span>
                        {rank && (
                          <span className="shrink-0 font-mono text-sm font-bold tabular-nums text-muted-foreground">
                            #{rank}
                          </span>
                        )}
                      </button>
                    </li>
                  )
                })
              )}
            </ul>
          </div>
        </div>
      )}

      {selected && (
        <PlayerProfileModal
          player={selected}
          rank={rankByUsername.get(selected.username) ?? null}
          gamemodes={activeGamemodes}
          titles={titles}
          onClose={() => setSelected(null)}
        />
      )}
    </section>
  )
}

function EmptyState({ label = "No ranked players yet." }: { label?: string }) {
  return (
    <div className="rounded-xl border border-border bg-card p-8 text-center text-muted-foreground">
      {label}
    </div>
  )
}
