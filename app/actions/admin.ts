"use server"

import { revalidatePath } from "next/cache"
import { put } from "@vercel/blob"
import { query } from "@/lib/db"
import { ensureSchema } from "@/lib/schema"
import { saveTheme } from "@/lib/settings"
import { isAdmin, signInAdmin, signOutAdmin } from "@/lib/admin"
import { GAMEMODE_ICONS } from "@/lib/tiers"
import { normalizeHex } from "@/lib/colors"

// Returns true when the caller is an admin. We intentionally do NOT throw here:
// a thrown error inside a server action bubbles up to the client error boundary
// and shows the "reload" screen. Returning false lets the action no-op safely.
async function requireAdmin(): Promise<boolean> {
  return isAdmin()
}

async function gamemodeExists(slug: string): Promise<boolean> {
  const rows = await query<{ n: number }>(`SELECT COUNT(*)::int AS n FROM gamemodes WHERE slug = $1`, [slug])
  return (rows[0]?.n ?? 0) > 0
}

// Mode ('tiers' | 'points') of the tier list that owns a gamemode.
async function gamemodeMode(slug: string): Promise<"tiers" | "points"> {
  const rows = await query<{ mode: string | null }>(
    `SELECT t.mode FROM gamemodes g LEFT JOIN tierlists t ON t.id = g.tierlist_id WHERE g.slug = $1`,
    [slug],
  )
  return rows[0]?.mode === "points" ? "points" : "tiers"
}

export async function loginAction(_prev: unknown, formData: FormData) {
  const code = String(formData.get("code") ?? "")
  const ok = await signInAdmin(code)
  if (!ok) return { error: "Invalid access code." }
  revalidatePath("/admin")
  return { error: null }
}

export async function logoutAction() {
  await signOutAdmin()
  revalidatePath("/admin")
}

export async function createPlayer(formData: FormData) {
  if (!(await requireAdmin())) return
  const username = String(formData.get("username") ?? "").trim()
  const region = String(formData.get("region") ?? "").trim() || null
  if (!username) return
  await query(`INSERT INTO players (username, region) VALUES ($1, $2)`, [username, region])
  revalidatePath("/admin")
  revalidatePath("/")
}

export async function deletePlayer(formData: FormData) {
  if (!(await requireAdmin())) return
  const id = Number(formData.get("id"))
  if (!id) return
  await query(`DELETE FROM player_tiers WHERE player_id = $1`, [id])
  await query(`DELETE FROM players WHERE id = $1`, [id])
  revalidatePath("/admin")
  revalidatePath("/")
}

export async function setTier(formData: FormData) {
  if (!(await requireAdmin())) return
  const playerId = Number(formData.get("playerId"))
  const gamemode = String(formData.get("gamemode") ?? "")
  const tier = Number(formData.get("tier"))
  const tierType = String(formData.get("tierType") ?? "")

  if (!playerId || tier < 1 || tier > 5 || !["HT", "LT"].includes(tierType)) return
  if (!(await gamemodeExists(gamemode))) return
  // This action only applies to tier-based lists.
  if ((await gamemodeMode(gamemode)) !== "tiers") return

  // Enforce a single HT1 per gamemode: clear any other player's HT1 first.
  if (tierType === "HT" && tier === 1) {
    await query(
      `DELETE FROM player_tiers
       WHERE gamemode = $1 AND tier = 1 AND tier_type = 'HT' AND player_id <> $2`,
      [gamemode, playerId],
    )
  }

  await query(
    `INSERT INTO player_tiers (player_id, gamemode, tier, tier_type, points)
     VALUES ($1, $2, $3, $4, NULL)
     ON CONFLICT (player_id, gamemode)
     DO UPDATE SET tier = EXCLUDED.tier, tier_type = EXCLUDED.tier_type, points = NULL`,
    [playerId, gamemode, tier, tierType],
  )
  revalidatePath("/admin")
  revalidatePath("/")
}

// Points mode: assign a raw point value to a player for a gamemode that lives
// inside a "points" tier list (instead of an HT/LT tier).
export async function setPoints(formData: FormData) {
  if (!(await requireAdmin())) return
  const playerId = Number(formData.get("playerId"))
  const gamemode = String(formData.get("gamemode") ?? "")
  const points = Math.trunc(Number(formData.get("points")))

  if (!playerId || !gamemode || Number.isNaN(points)) return
  if (!(await gamemodeExists(gamemode))) return
  if ((await gamemodeMode(gamemode)) !== "points") return

  await query(
    `INSERT INTO player_tiers (player_id, gamemode, tier, tier_type, points)
     VALUES ($1, $2, 0, 'PT', $3)
     ON CONFLICT (player_id, gamemode)
     DO UPDATE SET tier = 0, tier_type = 'PT', points = EXCLUDED.points`,
    [playerId, gamemode, points],
  )
  revalidatePath("/admin")
  revalidatePath("/")
}

export async function removeTier(formData: FormData) {
  if (!(await requireAdmin())) return
  const playerId = Number(formData.get("playerId"))
  const gamemode = String(formData.get("gamemode") ?? "")
  if (!playerId || !gamemode) return
  await query(`DELETE FROM player_tiers WHERE player_id = $1 AND gamemode = $2`, [playerId, gamemode])
  revalidatePath("/admin")
  revalidatePath("/")
}

// ----- Gamemode configuration -----

function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
}

async function tierlistExists(id: number): Promise<boolean> {
  const rows = await query<{ n: number }>(`SELECT COUNT(*)::int AS n FROM tierlists WHERE id = $1`, [id])
  return (rows[0]?.n ?? 0) > 0
}

async function defaultTierlistId(): Promise<number | null> {
  const rows = await query<{ id: number }>(`SELECT id FROM tierlists ORDER BY sort_order ASC, id ASC LIMIT 1`)
  return rows[0]?.id ?? null
}

export async function createGamemode(formData: FormData) {
  if (!(await requireAdmin())) return
  const label = String(formData.get("label") ?? "").trim()
  let icon = String(formData.get("icon") ?? "sword").trim()
  if (!label) return
  if (!GAMEMODE_ICONS[icon]) icon = "sword"

  // Which tier list this gamemode belongs to.
  let tierlistId = Number(formData.get("tierlistId"))
  if (!tierlistId || !(await tierlistExists(tierlistId))) {
    const fallback = await defaultTierlistId()
    if (!fallback) return
    tierlistId = fallback
  }

  const slug = slugify(label)
  if (!slug) return
  if (await gamemodeExists(slug)) return

  const rows = await query<{ max: number | null }>(`SELECT MAX(sort_order) AS max FROM gamemodes`)
  const nextOrder = (rows[0]?.max ?? -1) + 1

  await query(
    `INSERT INTO gamemodes (slug, label, icon, sort_order, tierlist_id) VALUES ($1, $2, $3, $4, $5)`,
    [slug, label, icon, nextOrder, tierlistId],
  )
  revalidatePath("/admin")
  revalidatePath("/")
}

export async function moveGamemode(formData: FormData) {
  if (!(await requireAdmin())) return
  const id = Number(formData.get("id"))
  const tierlistId = Number(formData.get("tierlistId"))
  if (!id || !tierlistId || !(await tierlistExists(tierlistId))) return
  await query(`UPDATE gamemodes SET tierlist_id = $1 WHERE id = $2`, [tierlistId, id])
  revalidatePath("/admin")
  revalidatePath("/")
}

// ----- Tier list configuration -----

export async function createTierlist(formData: FormData) {
  if (!(await requireAdmin())) return
  const label = String(formData.get("label") ?? "").trim()
  if (!label) return
  const mode = String(formData.get("mode") ?? "tiers") === "points" ? "points" : "tiers"

  let slug = slugify(label)
  if (!slug) return
  // Guarantee a unique slug even if the label repeats.
  const existing = await query<{ n: number }>(`SELECT COUNT(*)::int AS n FROM tierlists WHERE slug = $1`, [slug])
  if ((existing[0]?.n ?? 0) > 0) slug = `${slug}-${Date.now().toString(36)}`

  const rows = await query<{ max: number | null }>(`SELECT MAX(sort_order) AS max FROM tierlists`)
  const nextOrder = (rows[0]?.max ?? -1) + 1

  await query(`INSERT INTO tierlists (slug, label, sort_order, mode) VALUES ($1, $2, $3, $4)`, [
    slug,
    label,
    nextOrder,
    mode,
  ])
  revalidatePath("/admin")
  revalidatePath("/")
}

export async function deleteTierlist(formData: FormData) {
  if (!(await requireAdmin())) return
  const id = Number(formData.get("id"))
  if (!id) return

  // Never allow deleting the final tier list.
  const count = await query<{ n: number }>(`SELECT COUNT(*)::int AS n FROM tierlists`)
  if ((count[0]?.n ?? 0) <= 1) return

  // Remove every gamemode (and its player tiers) that belongs to this list.
  const gms = await query<{ slug: string }>(`SELECT slug FROM gamemodes WHERE tierlist_id = $1`, [id])
  for (const gm of gms) {
    await query(`DELETE FROM player_tiers WHERE gamemode = $1`, [gm.slug])
  }
  await query(`DELETE FROM gamemodes WHERE tierlist_id = $1`, [id])
  await query(`DELETE FROM tierlists WHERE id = $1`, [id])
  revalidatePath("/admin")
  revalidatePath("/")
}

export async function updateGamemodeIcon(formData: FormData) {
  if (!(await requireAdmin())) return
  const id = Number(formData.get("id"))
  let icon = String(formData.get("icon") ?? "").trim()
  if (!id || !GAMEMODE_ICONS[icon]) return
  await query(`UPDATE gamemodes SET icon = $1 WHERE id = $2`, [icon, id])
  revalidatePath("/admin")
  revalidatePath("/")
}

export async function deleteGamemode(formData: FormData) {
  if (!(await requireAdmin())) return
  const id = Number(formData.get("id"))
  if (!id) return
  const rows = await query<{ slug: string }>(`SELECT slug FROM gamemodes WHERE id = $1`, [id])
  const slug = rows[0]?.slug
  if (!slug) return
  await query(`DELETE FROM player_tiers WHERE gamemode = $1`, [slug])
  await query(`DELETE FROM gamemodes WHERE id = $1`, [id])
  revalidatePath("/admin")
  revalidatePath("/")
}

// ----- Title configuration -----

export async function updateTitle(formData: FormData) {
  if (!(await requireAdmin())) return
  const id = Number(formData.get("id"))
  const name = String(formData.get("name") ?? "").trim()
  const min = Number(formData.get("min"))
  const color = normalizeHex(String(formData.get("color") ?? "")) ?? "#fca5a5"
  if (!id || !name || Number.isNaN(min)) return
  await query(`UPDATE titles SET name = $1, min_points = $2, color = $3 WHERE id = $4`, [name, min, color, id])
  revalidatePath("/admin")
  revalidatePath("/")
}

export async function createTitle(formData: FormData) {
  if (!(await requireAdmin())) return
  const name = String(formData.get("name") ?? "").trim()
  const min = Number(formData.get("min"))
  const color = normalizeHex(String(formData.get("color") ?? "")) ?? "#fca5a5"
  if (!name || Number.isNaN(min)) return
  await query(`INSERT INTO titles (name, min_points, class_name, color) VALUES ($1, $2, 'text-red-300', $3)`, [
    name,
    min,
    color,
  ])
  revalidatePath("/admin")
  revalidatePath("/")
}

// ----- Theme (color wheel) configuration -----

export async function saveThemeAction(formData: FormData) {
  if (!(await requireAdmin())) return
  const primary = String(formData.get("primary") ?? "")
  const accent = String(formData.get("accent") ?? "")
  const tierColors = [1, 2, 3, 4, 5].map((n) => String(formData.get(`tier${n}`) ?? ""))
  await saveTheme({ primary, accent, tierColors })
  revalidatePath("/admin")
  revalidatePath("/")
}

export async function deleteTitle(formData: FormData) {
  if (!(await requireAdmin())) return
  const id = Number(formData.get("id"))
  if (!id) return
  await query(`DELETE FROM titles WHERE id = $1`, [id])
  revalidatePath("/admin")
  revalidatePath("/")
}

// ----- Player skin uploads -----

export async function uploadPlayerSkin(formData: FormData) {
  if (!(await requireAdmin())) return
  const playerId = Number(formData.get("playerId"))
  const file = formData.get("skin")
  if (!playerId || !(file instanceof File) || file.size === 0) return

  // "skin" = a raw Minecraft skin texture PNG (face gets pixel-cropped),
  // "upload" = a regular photo shown directly as the avatar.
  const kind = String(formData.get("kind") ?? "upload") === "skin" ? "skin" : "upload"

  const ext = (file.name.split(".").pop() || "png").toLowerCase()
  const blob = await put(`skins/${playerId}-${Date.now()}.${ext}`, file, {
    access: "public",
    addRandomSuffix: true,
  })

  await query(`UPDATE players SET skin_url = $1, skin_source = $2 WHERE id = $3`, [blob.url, kind, playerId])
  revalidatePath("/admin")
  revalidatePath("/")
}

export async function removePlayerSkin(formData: FormData) {
  if (!(await requireAdmin())) return
  const playerId = Number(formData.get("playerId"))
  if (!playerId) return
  await query(`UPDATE players SET skin_url = NULL, skin_source = NULL WHERE id = $1`, [playerId])
  revalidatePath("/admin")
  revalidatePath("/")
}

// ----- Data import / export (Neon) -----

type ExportShape = {
  tierlists: { slug: string; label: string; sort_order: number; mode: string }[]
  gamemodes: { slug: string; label: string; icon: string; sort_order: number; tierlist_slug: string | null }[]
  titles: { name: string; min_points: number; color: string | null; class_name: string }[]
  players: {
    username: string
    region: string | null
    skin_url: string | null
    skin_source: string | null
    tiers: { gamemode: string; tier: number; tier_type: string; points: number | null }[]
  }[]
}

// Returns the full dataset as a formatted JSON string for backup / migration.
export async function exportData(): Promise<string> {
  if (!(await requireAdmin())) return ""
  await ensureSchema()

  const [tierlists, gamemodes, titles, playerRows] = await Promise.all([
    query<{ slug: string; label: string; sort_order: number; mode: string }>(
      `SELECT slug, label, sort_order, mode FROM tierlists ORDER BY sort_order ASC, id ASC`,
    ),
    query<{ slug: string; label: string; icon: string; sort_order: number; tierlist_slug: string | null }>(
      `SELECT g.slug, g.label, g.icon, g.sort_order, t.slug AS tierlist_slug
       FROM gamemodes g LEFT JOIN tierlists t ON t.id = g.tierlist_id
       ORDER BY g.sort_order ASC`,
    ),
    query<{ name: string; min_points: number; color: string | null; class_name: string }>(
      `SELECT name, min_points, color, class_name FROM titles ORDER BY min_points DESC`,
    ),
    query<{
      username: string
      region: string | null
      skin_url: string | null
      skin_source: string | null
      gamemode: string | null
      tier: number | null
      tier_type: string | null
      points: number | null
    }>(
      `SELECT p.username, p.region, p.skin_url, p.skin_source,
              t.gamemode, t.tier, t.tier_type, t.points
       FROM players p LEFT JOIN player_tiers t ON t.player_id = p.id
       ORDER BY p.username ASC`,
    ),
  ])

  const playerMap = new Map<string, ExportShape["players"][number]>()
  for (const r of playerRows) {
    let p = playerMap.get(r.username)
    if (!p) {
      p = {
        username: r.username,
        region: r.region,
        skin_url: r.skin_url,
        skin_source: r.skin_source,
        tiers: [],
      }
      playerMap.set(r.username, p)
    }
    if (r.gamemode && r.tier_type) {
      p.tiers.push({ gamemode: r.gamemode, tier: r.tier ?? 0, tier_type: r.tier_type, points: r.points })
    }
  }

  const data: ExportShape = {
    tierlists,
    gamemodes,
    titles,
    players: Array.from(playerMap.values()),
  }
  return JSON.stringify(data, null, 2)
}

// Imports a JSON payload (as produced by exportData). Upserts everything by
// slug / username so it is safe to re-run.
export async function importData(_prev: unknown, formData: FormData) {
  if (!(await requireAdmin())) return { error: "Unauthorized", ok: false }
  await ensureSchema()

  const raw = String(formData.get("json") ?? "")
  let data: ExportShape
  try {
    data = JSON.parse(raw)
  } catch {
    return { error: "Invalid JSON — could not parse.", ok: false }
  }

  try {
    // Tier lists
    for (const tl of data.tierlists ?? []) {
      if (!tl.slug || !tl.label) continue
      await query(
        `INSERT INTO tierlists (slug, label, sort_order, mode) VALUES ($1, $2, $3, $4)
         ON CONFLICT (slug) DO UPDATE SET label = EXCLUDED.label, sort_order = EXCLUDED.sort_order, mode = EXCLUDED.mode`,
        [tl.slug, tl.label, tl.sort_order ?? 0, tl.mode === "points" ? "points" : "tiers"],
      )
    }

    // Gamemodes (resolve tierlist_slug -> id)
    for (const gm of data.gamemodes ?? []) {
      if (!gm.slug || !gm.label) continue
      const tl = gm.tierlist_slug
        ? await query<{ id: number }>(`SELECT id FROM tierlists WHERE slug = $1`, [gm.tierlist_slug])
        : []
      const tierlistId =
        tl[0]?.id ??
        (await query<{ id: number }>(`SELECT id FROM tierlists ORDER BY sort_order ASC, id ASC LIMIT 1`))[0]?.id ??
        null
      await query(
        `INSERT INTO gamemodes (slug, label, icon, sort_order, tierlist_id) VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (slug) DO UPDATE SET label = EXCLUDED.label, icon = EXCLUDED.icon,
           sort_order = EXCLUDED.sort_order, tierlist_id = EXCLUDED.tierlist_id`,
        [gm.slug, gm.label, GAMEMODE_ICONS[gm.icon] ? gm.icon : "sword", gm.sort_order ?? 0, tierlistId],
      )
    }

    // Titles (clear + insert to avoid duplicate rows)
    if (Array.isArray(data.titles) && data.titles.length > 0) {
      await query(`DELETE FROM titles`)
      let i = 0
      for (const t of data.titles) {
        if (!t.name) continue
        await query(
          `INSERT INTO titles (name, min_points, class_name, color, sort_order) VALUES ($1, $2, $3, $4, $5)`,
          [t.name, t.min_points ?? 0, t.class_name ?? "text-red-300", normalizeHex(t.color ?? "") ?? null, i++],
        )
      }
    }

    // Players + their tiers
    for (const pl of data.players ?? []) {
      if (!pl.username) continue
      const rows = await query<{ id: number }>(
        `INSERT INTO players (username, region, skin_url, skin_source) VALUES ($1, $2, $3, $4)
         ON CONFLICT (username) DO UPDATE SET region = EXCLUDED.region,
           skin_url = EXCLUDED.skin_url, skin_source = EXCLUDED.skin_source
         RETURNING id`,
        [pl.username, pl.region ?? null, pl.skin_url ?? null, pl.skin_source ?? null],
      )
      const playerId = rows[0]?.id
      if (!playerId) continue
      for (const t of pl.tiers ?? []) {
        if (!t.gamemode) continue
        await query(
          `INSERT INTO player_tiers (player_id, gamemode, tier, tier_type, points) VALUES ($1, $2, $3, $4, $5)
           ON CONFLICT (player_id, gamemode) DO UPDATE SET tier = EXCLUDED.tier,
             tier_type = EXCLUDED.tier_type, points = EXCLUDED.points`,
          [playerId, t.gamemode, t.tier ?? 0, t.tier_type ?? "HT", t.points ?? null],
        )
      }
    }
  } catch (e) {
    return { error: `Import failed: ${(e as Error).message}`, ok: false }
  }

  revalidatePath("/admin")
  revalidatePath("/")
  return { error: null, ok: true }
}
