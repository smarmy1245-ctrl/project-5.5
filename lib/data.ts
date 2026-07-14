import "server-only"
import { query } from "./db"
import { ensureSchema } from "./schema"
import {
  DEFAULT_HT_COLOR,
  DEFAULT_LT_COLOR,
  DEFAULT_TIER_COLORS,
  pointsFor,
  type Gamemode,
  type ThemeColors,
  type Tierlist,
  type TierlistMode,
  type TierType,
} from "./tiers"

type RawTierlist = { id: number; slug: string; label: string; sort_order: number; mode: string }

// All configured tier lists, ordered for display.
export async function getTierlists(): Promise<Tierlist[]> {
  await ensureSchema()
  const rows = await query<RawTierlist>(
    `SELECT id, slug, label, sort_order, mode FROM tierlists ORDER BY sort_order ASC, id ASC`,
  )
  return rows.map((r) => ({
    id: r.id,
    slug: r.slug,
    label: r.label,
    sortOrder: r.sort_order,
    mode: (r.mode === "points" ? "points" : "tier") as TierlistMode,
  }))
}

type RawGamemode = {
  id: number
  slug: string
  label: string
  icon: string
  sort_order: number
  tierlist_id: number | null
  color: string | null
}

// All configured gamemodes, ordered for display.
export async function getGamemodes(): Promise<Gamemode[]> {
  await ensureSchema()
  const rows = await query<RawGamemode>(
    `SELECT id, slug, label, icon, sort_order, tierlist_id, color FROM gamemodes ORDER BY sort_order ASC, label ASC`,
  )
  return rows.map((r) => ({
    id: r.id,
    slug: r.slug,
    label: r.label,
    icon: r.icon,
    sortOrder: r.sort_order,
    tierlistId: r.tierlist_id ?? 0,
    color: r.color,
  }))
}

export type PlayerTier = {
  gamemode: string
  tier: number
  tierType: TierType
  points: number
  // Which kind of tier list this belongs to (affects how it's displayed).
  mode: TierlistMode
}

export type Player = {
  id: number
  username: string
  region: string | null
  skinUrl: string | null
  skinSource: string | null
  tiers: PlayerTier[]
  totalPoints: number
}

type RawRow = {
  id: number
  username: string
  region: string | null
  skin_url: string | null
  skin_source: string | null
  gamemode: string | null
  tier: number | null
  tier_type: string | null
  raw_points: number | null
  mode: string | null
}

// Returns every player with their per-gamemode tiers and combined total points.
export async function getPlayers(): Promise<Player[]> {
  await ensureSchema()
  const rows = await query<RawRow>(
    `SELECT p.id, p.username, p.region, p.skin_url, p.skin_source,
            t.gamemode, t.tier, t.tier_type, t.raw_points,
            tl.mode
     FROM players p
     LEFT JOIN player_tiers t ON t.player_id = p.id
     LEFT JOIN gamemodes g ON g.slug = t.gamemode
     LEFT JOIN tierlists tl ON tl.id = g.tierlist_id
     ORDER BY p.username ASC`,
  )

  const map = new Map<number, Player>()
  for (const r of rows) {
    let player = map.get(r.id)
    if (!player) {
      player = {
        id: r.id,
        username: r.username,
        region: r.region,
        skinUrl: r.skin_url,
        skinSource: r.skin_source,
        tiers: [],
        totalPoints: 0,
      }
      map.set(r.id, player)
    }
    if (!r.gamemode) continue

    const mode: TierlistMode = r.mode === "points" ? "points" : "tier"

    if (mode === "points") {
      // Points-mode gamemode: rank purely by the admin-entered number.
      const pts = r.raw_points ?? 0
      player.tiers.push({
        gamemode: r.gamemode,
        tier: 0,
        tierType: "HT",
        points: pts,
        mode,
      })
      player.totalPoints += pts
    } else if (r.tier && r.tier_type) {
      const type = r.tier_type as TierType
      const pts = pointsFor(r.tier, type)
      player.tiers.push({
        gamemode: r.gamemode,
        tier: r.tier,
        tierType: type,
        points: pts,
        mode,
      })
      player.totalPoints += pts
    }
  }

  return Array.from(map.values())
}

// Combined "All" ranking: sum of points across every gamemode, ranked numerically.
export async function getAllRanking(): Promise<Player[]> {
  const players = await getPlayers()
  return players
    .filter((p) => p.totalPoints > 0)
    .sort((a, b) => b.totalPoints - a.totalPoints || a.username.localeCompare(b.username))
}

export type TitleRow = {
  id: number
  name: string
  min: number
  className: string
  color: string | null
}

// All configured titles, highest threshold first.
export async function getTitles(): Promise<TitleRow[]> {
  await ensureSchema()
  const rows = await query<{ id: number; name: string; min_points: number; class_name: string; color: string | null }>(
    `SELECT id, name, min_points, class_name, color FROM titles ORDER BY min_points DESC`,
  )
  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    min: r.min_points,
    className: r.class_name,
    color: r.color,
  }))
}

// Admin-customizable theme colors (tier colors + HT/LT accents).
export async function getThemeColors(): Promise<ThemeColors> {
  await ensureSchema()
  const tierRows = await query<{ tier: number; color: string }>(`SELECT tier, color FROM tier_colors`)
  const tierColors: Record<number, string> = { ...DEFAULT_TIER_COLORS }
  for (const r of tierRows) tierColors[r.tier] = r.color

  const settingRows = await query<{ key: string; value: string }>(
    `SELECT key, value FROM app_settings WHERE key IN ('ht_color', 'lt_color')`,
  )
  const settings = new Map(settingRows.map((s) => [s.key, s.value]))

  return {
    tierColors,
    htColor: settings.get("ht_color") ?? DEFAULT_HT_COLOR,
    ltColor: settings.get("lt_color") ?? DEFAULT_LT_COLOR,
  }
}

// Ranking for a single gamemode, ranked by that gamemode's points.
export async function getGamemodeRanking(gamemode: string): Promise<Player[]> {
  const players = await getPlayers()
  return players
    .map((p) => ({
      player: p,
      gm: p.tiers.find((t) => t.gamemode === gamemode),
    }))
    .filter((x) => x.gm)
    .sort((a, b) => (b.gm!.points - a.gm!.points) || a.player.username.localeCompare(b.player.username))
    .map((x) => x.player)
}
