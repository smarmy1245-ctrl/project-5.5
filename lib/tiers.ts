// Central tier/points configuration for Smarmy Tiers.
// LT/HT system just like mctiers.

import {
  Heart,
  Sword,
  Axe,
  Shield,
  Flame,
  Zap,
  Gem,
  Trophy,
  Skull,
  Crown,
  Target,
  Hammer,
  Pickaxe,
  Wand2,
  FlaskRound,
  FlaskConical,
  type LucideIcon,
} from "lucide-react"

export type TierType = "HT" | "LT"

// A tier list can rank players two ways:
//  - "tier"   : classic HT/LT tiers (points derived from the tier table)
//  - "points" : admin types a raw point number per gamemode; ranking is by that number
export type TierlistMode = "tier" | "points"

// A tier list is a self-contained board (e.g. "Main Tier", "Subtiers").
// Each gamemode belongs to exactly one tier list, and points are summed
// independently per tier list — they are never combined across lists.
export type Tierlist = {
  id: number
  slug: string
  label: string
  sortOrder: number
  mode: TierlistMode
}

// A gamemode configured in the admin panel (backed by the `gamemodes` table).
export type Gamemode = {
  id: number
  slug: string
  label: string
  icon: string
  sortOrder: number
  tierlistId: number
  // Custom hex color chosen via the admin color wheel (null = use theme primary).
  color: string | null
}

// Theme colors that admins can customize with the color wheel.
export type ThemeColors = {
  // Per-tier header/badge colors, keyed by tier number (1-5).
  tierColors: Record<number, string>
  // High-tier / low-tier accent colors used in the information panel + tier board.
  htColor: string
  ltColor: string
}

// Default per-tier colors (red shades — tier 1 darkest → tier 5 lightest).
export const DEFAULT_TIER_COLORS: Record<number, string> = {
  1: "#450a0a",
  2: "#7f1d1d",
  3: "#991b1b",
  4: "#b91c1c",
  5: "#dc2626",
}

export const DEFAULT_HT_COLOR = "#f43f5e"
export const DEFAULT_LT_COLOR = "#10b981"

export const DEFAULT_THEME_COLORS: ThemeColors = {
  tierColors: DEFAULT_TIER_COLORS,
  htColor: DEFAULT_HT_COLOR,
  ltColor: DEFAULT_LT_COLOR,
}

// Returns a readable foreground (black/white) for a given hex background.
export function readableOn(hex: string): string {
  const c = hex.replace("#", "")
  if (c.length < 6) return "#ffffff"
  const r = Number.parseInt(c.slice(0, 2), 16)
  const g = Number.parseInt(c.slice(2, 4), 16)
  const b = Number.parseInt(c.slice(4, 6), 16)
  // Perceived luminance.
  const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255
  return lum > 0.6 ? "#111111" : "#ffffff"
}

// Icon registry — gamemodes store an icon key which maps to a lucide icon.
export const GAMEMODE_ICONS: Record<string, LucideIcon> = {
  heart: Heart,
  sword: Sword,
  axe: Axe,
  mace: Hammer,
  pickaxe: Pickaxe,
  shield: Shield,
  flame: Flame,
  zap: Zap,
  gem: Gem,
  trophy: Trophy,
  skull: Skull,
  crown: Crown,
  target: Target,
  wand: Wand2,
  potion: FlaskRound,
  brew: FlaskConical,
}

export const GAMEMODE_ICON_OPTIONS = Object.keys(GAMEMODE_ICONS)
export const DEFAULT_GAMEMODE_ICON = "sword"

export function gamemodeIcon(key: string | null | undefined): LucideIcon {
  return GAMEMODE_ICONS[key ?? ""] ?? GAMEMODE_ICONS[DEFAULT_GAMEMODE_ICON]
}

// Points table (matches the reference):
// TIER 1  HT 60 / LT 45
// TIER 2  HT 30 / LT 20
// TIER 3  HT 10 / LT 6
// TIER 4  HT 4  / LT 3
// TIER 5  HT 2  / LT 1
export const POINTS: Record<number, { HT: number; LT: number }> = {
  1: { HT: 60, LT: 45 },
  2: { HT: 30, LT: 20 },
  3: { HT: 10, LT: 6 },
  4: { HT: 4, LT: 3 },
  5: { HT: 2, LT: 1 },
}

export function pointsFor(tier: number, type: TierType): number {
  const row = POINTS[tier]
  if (!row) return 0
  return row[type] ?? 0
}

// Formats a tier badge label, e.g. "HT1", "LT3".
export function tierLabel(tier: number, type: TierType): string {
  return `${type}${tier}`
}

// Title thresholds based on combined points (used in the "Overall" section + Titles tab).
// These are now stored in the database (see `titles` table) and editable in the admin
// panel. The list below is only a fallback used if the database has no titles configured.
export type Title = { name: string; min: number; className: string; color?: string | null }

export const TITLES: Title[] = [
  { name: "SMARMY'S GRANDMASTER", min: 400, className: "text-amber-400", color: "#fbbf24" },
  { name: "SMARMY'S MASTER", min: 250, className: "text-orange-400", color: "#fb923c" },
  { name: "SMARMY'S ACE", min: 100, className: "text-rose-400", color: "#fb7185" },
  { name: "SMARMY'S SPECIALIST", min: 50, className: "text-red-400", color: "#f87171" },
  { name: "SMARMY'S CADET", min: 10, className: "text-red-300", color: "#fca5a5" },
  { name: "SMARMY'S ROOKIE", min: 1, className: "text-muted-foreground", color: null },
]

export type ResolvedTitle = { name: string; className: string; color: string | null }

export function titleFor(points: number): ResolvedTitle {
  return titleForList(points, TITLES)
}

// Resolve a title from an arbitrary (database-backed) title list.
export function titleForList(
  points: number,
  titles: { name: string; min: number; className: string; color?: string | null }[],
): ResolvedTitle {
  const sorted = [...titles].sort((a, b) => b.min - a.min)
  for (const t of sorted) {
    if (points >= t.min) return { name: t.name, className: t.className, color: t.color ?? null }
  }
  return { name: "UNRANKED", className: "text-muted-foreground", color: null }
}

// Diagonal rank tag colors for the overall leaderboard:
// #1 darkest red, #2 medium red, #3 light red, others neutral.
export function overallRankBadge(rank: number): string {
  if (rank === 1) return "bg-red-950 text-red-50"
  if (rank === 2) return "bg-red-700 text-white"
  if (rank === 3) return "bg-red-400 text-red-950"
  return "bg-secondary text-foreground"
}

// NameMC profile URL for a username.
export function nameMcUrl(username: string): string {
  return `https://namemc.com/profile/${encodeURIComponent(username)}`
}

// Red shades per tier for the tier board / points rows.
// Tier 1 = darkest red, Tier 5 = lightest red.
export function tierHeaderClasses(tier: number): string {
  switch (tier) {
    case 1:
      return "bg-red-950 text-red-100 border-red-900"
    case 2:
      return "bg-red-900 text-red-50 border-red-800"
    case 3:
      return "bg-red-800 text-red-50 border-red-700"
    case 4:
      return "bg-red-700 text-white border-red-600"
    case 5:
      return "bg-red-600 text-white border-red-500"
    default:
      return "bg-card text-foreground border-border"
  }
}

// Just the red text shade for a tier (used in the Points modal labels).
export function tierTextClass(tier: number): string {
  switch (tier) {
    case 1:
      return "text-red-300"
    case 2:
      return "text-red-400"
    case 3:
      return "text-red-500"
    case 4:
      return "text-red-400"
    case 5:
      return "text-red-300"
    default:
      return "text-foreground"
  }
}

// Color styling per tier for the little tier badges.
export function tierBadgeClasses(tier: number, type: TierType): string {
  // HT is "high" (hot/red-orange), LT is "low" (cooler/green) — mirrors mctiers.
  if (type === "HT") {
    switch (tier) {
      case 1:
        return "bg-amber-500/15 text-amber-400 border-amber-500/30"
      case 2:
        return "bg-orange-500/15 text-orange-400 border-orange-500/30"
      case 3:
        return "bg-red-500/15 text-red-400 border-red-500/30"
      default:
        return "bg-red-900/30 text-red-300 border-red-800/40"
    }
  }
  // LT
  switch (tier) {
    case 1:
      return "bg-emerald-500/10 text-emerald-400 border-emerald-500/25"
    case 2:
      return "bg-teal-500/10 text-teal-300 border-teal-500/25"
    default:
      return "bg-slate-500/10 text-slate-300 border-slate-500/25"
  }
}

// Rank number coloring (#1 gold, #2 silver, #3 bronze).
export function rankClass(rank: number): string {
  if (rank === 1) return "text-amber-400"
  if (rank === 2) return "text-slate-300"
  if (rank === 3) return "text-orange-400"
  return "text-muted-foreground"
}

// Skin avatar (head) and full body via mc-heads (no API key required).
export function skinHead(username: string): string {
  return `https://mc-heads.net/avatar/${encodeURIComponent(username)}/96`
}

export function skinBody(username: string): string {
  return `https://mc-heads.net/body/${encodeURIComponent(username)}/128`
}
