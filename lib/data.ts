import "server-only"
import { query } from "./db"
import { ensureSchema } from "./schema"
import { pointsFor, type Gamemode, type Tierlist, type TierType } from "./tiers"
import {
  COLOR_FIELDS,
  DEFAULT_LOGO_URL,
  DEFAULT_SITE_TITLE,
  LOGO_URL_KEY,
  SITE_TITLE_KEY,
  type SiteSettings,
} from "./site-settings"

// Resolved site appearance settings (defaults merged with saved overrides).
export async function getSiteSettings(): Promise<SiteSettings> {
  await ensureSchema()
  const rows = await query<{ key: string; value: string }>(`SELECT key, value FROM site_settings`)
  const map = new Map(rows.map((r) => [r.key, r.value]))

  const colors: Record<string, string> = {}
  const overrides: { cssVar: string; value: string }[] = []
  for (const field of COLOR_FIELDS) {
    const saved = map.get(field.dbKey)
    colors[field.key] = saved ?? field.default
    if (saved) overrides.push({ cssVar: field.cssVar, value: saved })
  }

  return {
    siteTitle: map.get(SITE_TITLE_KEY) ?? DEFAULT_SITE_TITLE,
    logoUrl: map.get(LOGO_URL_KEY) ?? DEFAULT_LOGO_URL,
    colors,
    overrides,
  }
}

type RawTierlist = { id: number; slug: string; label: string; sort_order: number }

// All configured tier lists, ordered for display.
export async function getTierlists(): Promise<Tierlist[]> {
  await ensureSchema()
  const rows = await query<RawTierlist>(
    `SELECT id, slug, label, sort_order FROM tierlists ORDER BY sort_order ASC, id ASC`,
  )
  return rows.map((r) => ({
    id: r.id,
    slug: r.slug,
    label: r.label,
    sortOrder: r.sort_order,
  }))
}

type RawGamemode = {
  id: number
  slug: string
  label: string
  icon: string
  sort_order: number
  tierlist_id: number | null
}

// All configured gamemodes, ordered for display.
export async function getGamemodes(): Promise<Gamemode[]> {
  await ensureSchema()
  const rows = await query<RawGamemode>(
    `SELECT id, slug, label, icon, sort_order, tierlist_id FROM gamemodes ORDER BY sort_order ASC, label ASC`,
  )
  return rows.map((r) => ({
    id: r.id,
    slug: r.slug,
    label: r.label,
    icon: r.icon,
    sortOrder: r.sort_order,
    tierlistId: r.tierlist_id ?? 0,
  }))
}

export type PlayerTier = {
  gamemode: string
  tier: number
  tierType: TierType
  points: number
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
}

// Returns every player with their per-gamemode tiers and combined total points.
export async function getPlayers(): Promise<Player[]> {
  await ensureSchema()
  const rows = await query<RawRow>(
    `SELECT p.id, p.username, p.region, p.skin_url, p.skin_source,
            t.gamemode, t.tier, t.tier_type
     FROM players p
     LEFT JOIN player_tiers t ON t.player_id = p.id
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
    if (r.gamemode && r.tier && r.tier_type) {
      const type = r.tier_type as TierType
      const pts = pointsFor(r.tier, type)
      player.tiers.push({
        gamemode: r.gamemode,
        tier: r.tier,
        tierType: type,
        points: pts,
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
}

// All configured titles, highest threshold first.
export async function getTitles(): Promise<TitleRow[]> {
  await ensureSchema()
  const rows = await query<{ id: number; name: string; min_points: number; class_name: string }>(
    `SELECT id, name, min_points, class_name FROM titles ORDER BY min_points DESC`,
  )
  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    min: r.min_points,
    className: r.class_name,
  }))
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
