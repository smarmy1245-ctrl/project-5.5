"use server"

import { revalidatePath } from "next/cache"
import { put } from "@vercel/blob"
import { query } from "@/lib/db"
import { isAdmin, signInAdmin, signOutAdmin } from "@/lib/admin"
import { GAMEMODE_ICONS } from "@/lib/tiers"

async function requireAdmin() {
  if (!(await isAdmin())) throw new Error("Unauthorized")
}

// Accepts "#rrggbb" hex colors only; returns null for anything else.
function cleanHex(input: unknown): string | null {
  const s = String(input ?? "").trim()
  return /^#[0-9a-fA-F]{6}$/.test(s) ? s.toLowerCase() : null
}

async function gamemodeExists(slug: string): Promise<boolean> {
  const rows = await query<{ n: number }>(`SELECT COUNT(*)::int AS n FROM gamemodes WHERE slug = $1`, [slug])
  return (rows[0]?.n ?? 0) > 0
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
  await requireAdmin()
  const username = String(formData.get("username") ?? "").trim()
  const region = String(formData.get("region") ?? "").trim() || null
  if (!username) return
  await query(`INSERT INTO players (username, region) VALUES ($1, $2) ON CONFLICT (username) DO NOTHING`, [
    username,
    region,
  ])
  revalidatePath("/admin")
  revalidatePath("/")
}

export async function deletePlayer(formData: FormData) {
  await requireAdmin()
  const id = Number(formData.get("id"))
  if (!id) return
  await query(`DELETE FROM player_tiers WHERE player_id = $1`, [id])
  await query(`DELETE FROM players WHERE id = $1`, [id])
  revalidatePath("/admin")
  revalidatePath("/")
}

export async function setTier(formData: FormData) {
  await requireAdmin()
  const playerId = Number(formData.get("playerId"))
  const gamemode = String(formData.get("gamemode") ?? "")
  const tier = Number(formData.get("tier"))
  const tierType = String(formData.get("tierType") ?? "")

  if (!playerId || tier < 1 || tier > 5 || !["HT", "LT"].includes(tierType)) return
  if (!(await gamemodeExists(gamemode))) return

  // Enforce a single HT1 per gamemode: clear any other player's HT1 first.
  if (tierType === "HT" && tier === 1) {
    await query(
      `DELETE FROM player_tiers
       WHERE gamemode = $1 AND tier = 1 AND tier_type = 'HT' AND player_id <> $2`,
      [gamemode, playerId],
    )
  }

  await query(
    `INSERT INTO player_tiers (player_id, gamemode, tier, tier_type, raw_points)
     VALUES ($1, $2, $3, $4, NULL)
     ON CONFLICT (player_id, gamemode)
     DO UPDATE SET tier = EXCLUDED.tier, tier_type = EXCLUDED.tier_type, raw_points = NULL`,
    [playerId, gamemode, tier, tierType],
  )
  revalidatePath("/admin")
  revalidatePath("/")
}

// Points-mode: store the raw point number directly (tier fields unused).
export async function setPoints(formData: FormData) {
  await requireAdmin()
  const playerId = Number(formData.get("playerId"))
  const gamemode = String(formData.get("gamemode") ?? "")
  const points = Number(formData.get("points"))
  if (!playerId || Number.isNaN(points)) return
  if (!(await gamemodeExists(gamemode))) return

  await query(
    `INSERT INTO player_tiers (player_id, gamemode, tier, tier_type, raw_points)
     VALUES ($1, $2, 0, 'HT', $3)
     ON CONFLICT (player_id, gamemode)
     DO UPDATE SET raw_points = EXCLUDED.raw_points, tier = 0, tier_type = 'HT'`,
    [playerId, gamemode, Math.round(points)],
  )
  revalidatePath("/admin")
  revalidatePath("/")
}

export async function removeTier(formData: FormData) {
  await requireAdmin()
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
  await requireAdmin()
  const label = String(formData.get("label") ?? "").trim()
  let icon = String(formData.get("icon") ?? "sword").trim()
  const color = cleanHex(formData.get("color"))
  if (!label) return
  if (!GAMEMODE_ICONS[icon]) icon = "sword"

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
    `INSERT INTO gamemodes (slug, label, icon, sort_order, tierlist_id, color) VALUES ($1, $2, $3, $4, $5, $6)`,
    [slug, label, icon, nextOrder, tierlistId, color],
  )
  revalidatePath("/admin")
  revalidatePath("/")
}

export async function updateGamemodeColor(formData: FormData) {
  await requireAdmin()
  const id = Number(formData.get("id"))
  const color = cleanHex(formData.get("color"))
  if (!id) return
  await query(`UPDATE gamemodes SET color = $1 WHERE id = $2`, [color, id])
  revalidatePath("/admin")
  revalidatePath("/")
}

export async function moveGamemode(formData: FormData) {
  await requireAdmin()
  const id = Number(formData.get("id"))
  const tierlistId = Number(formData.get("tierlistId"))
  if (!id || !tierlistId || !(await tierlistExists(tierlistId))) return
  await query(`UPDATE gamemodes SET tierlist_id = $1 WHERE id = $2`, [tierlistId, id])
  revalidatePath("/admin")
  revalidatePath("/")
}

// ----- Tier list configuration -----

export async function createTierlist(formData: FormData) {
  await requireAdmin()
  const label = String(formData.get("label") ?? "").trim()
  const mode = String(formData.get("mode") ?? "tier") === "points" ? "points" : "tier"
  if (!label) return

  let slug = slugify(label)
  if (!slug) return
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

export async function setTierlistMode(formData: FormData) {
  await requireAdmin()
  const id = Number(formData.get("id"))
  const mode = String(formData.get("mode") ?? "tier") === "points" ? "points" : "tier"
  if (!id) return
  await query(`UPDATE tierlists SET mode = $1 WHERE id = $2`, [mode, id])
  revalidatePath("/admin")
  revalidatePath("/")
}

export async function renameTierlist(formData: FormData) {
  await requireAdmin()
  const id = Number(formData.get("id"))
  const label = String(formData.get("label") ?? "").trim()
  if (!id || !label) return
  await query(`UPDATE tierlists SET label = $1 WHERE id = $2`, [label, id])
  revalidatePath("/admin")
  revalidatePath("/")
}

export async function deleteTierlist(formData: FormData) {
  await requireAdmin()
  const id = Number(formData.get("id"))
  if (!id) return

  // Never allow deleting the final tier list.
  const count = await query<{ n: number }>(`SELECT COUNT(*)::int AS n FROM tierlists`)
  if ((count[0]?.n ?? 0) <= 1) return

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
  await requireAdmin()
  const id = Number(formData.get("id"))
  const icon = String(formData.get("icon") ?? "").trim()
  if (!id || !GAMEMODE_ICONS[icon]) return
  await query(`UPDATE gamemodes SET icon = $1 WHERE id = $2`, [icon, id])
  revalidatePath("/admin")
  revalidatePath("/")
}

export async function deleteGamemode(formData: FormData) {
  await requireAdmin()
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
  await requireAdmin()
  const id = Number(formData.get("id"))
  const name = String(formData.get("name") ?? "").trim()
  const min = Number(formData.get("min"))
  const color = cleanHex(formData.get("color"))
  if (!id || !name || Number.isNaN(min)) return
  await query(`UPDATE titles SET name = $1, min_points = $2, color = $3 WHERE id = $4`, [name, min, color, id])
  revalidatePath("/admin")
  revalidatePath("/")
}

export async function updateTitleColor(formData: FormData) {
  await requireAdmin()
  const id = Number(formData.get("id"))
  const color = cleanHex(formData.get("color"))
  if (!id) return
  await query(`UPDATE titles SET color = $1 WHERE id = $2`, [color, id])
  revalidatePath("/admin")
  revalidatePath("/")
}

export async function createTitle(formData: FormData) {
  await requireAdmin()
  const name = String(formData.get("name") ?? "").trim()
  const min = Number(formData.get("min"))
  const color = cleanHex(formData.get("color")) ?? "#fca5a5"
  if (!name || Number.isNaN(min)) return
  await query(`INSERT INTO titles (name, min_points, class_name, color) VALUES ($1, $2, 'text-red-300', $3)`, [
    name,
    min,
    color,
  ])
  revalidatePath("/admin")
  revalidatePath("/")
}

export async function deleteTitle(formData: FormData) {
  await requireAdmin()
  const id = Number(formData.get("id"))
  if (!id) return
  await query(`DELETE FROM titles WHERE id = $1`, [id])
  revalidatePath("/admin")
  revalidatePath("/")
}

// ----- Theme colors (tier colors + HT/LT accents) -----

export async function updateTierColor(formData: FormData) {
  await requireAdmin()
  const tier = Number(formData.get("tier"))
  const color = cleanHex(formData.get("color"))
  if (!tier || tier < 1 || tier > 5 || !color) return
  await query(
    `INSERT INTO tier_colors (tier, color) VALUES ($1, $2) ON CONFLICT (tier) DO UPDATE SET color = EXCLUDED.color`,
    [tier, color],
  )
  revalidatePath("/admin")
  revalidatePath("/")
}

export async function updateAccentColors(formData: FormData) {
  await requireAdmin()
  const ht = cleanHex(formData.get("htColor"))
  const lt = cleanHex(formData.get("ltColor"))
  if (ht) {
    await query(
      `INSERT INTO app_settings (key, value) VALUES ('ht_color', $1) ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value`,
      [ht],
    )
  }
  if (lt) {
    await query(
      `INSERT INTO app_settings (key, value) VALUES ('lt_color', $1) ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value`,
      [lt],
    )
  }
  revalidatePath("/admin")
  revalidatePath("/")
}

// ----- Bulk JSON import (paste from the Neon console) -----

type ImportTier = { gamemode?: string; tier?: number; tierType?: string; points?: number }
type ImportPlayer = {
  username?: string
  region?: string | null
  tiers?: ImportTier[]
  points?: { gamemode?: string; points?: number }[]
}

export async function importData(_prev: unknown, formData: FormData) {
  try {
    await requireAdmin()
  } catch {
    return { ok: false, message: "Unauthorized." }
  }

  const raw = String(formData.get("json") ?? "").trim()
  if (!raw) return { ok: false, message: "Paste some JSON first." }

  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    return { ok: false, message: "That isn't valid JSON." }
  }

  // Accept either a bare array or an object with a `players` key.
  const list: ImportPlayer[] = Array.isArray(parsed)
    ? (parsed as ImportPlayer[])
    : Array.isArray((parsed as { players?: unknown }).players)
      ? ((parsed as { players: ImportPlayer[] }).players)
      : []

  if (list.length === 0) return { ok: false, message: "No players found in the JSON." }

  // Known gamemodes so we only import tiers for gamemodes that exist.
  const gmRows = await query<{ slug: string }>(`SELECT slug FROM gamemodes`)
  const knownGamemodes = new Set(gmRows.map((g) => g.slug))

  let players = 0
  let tiers = 0
  for (const p of list) {
    const username = String(p.username ?? "").trim()
    if (!username) continue
    const region = p.region != null ? String(p.region).trim() || null : null

    const inserted = await query<{ id: number }>(
      `INSERT INTO players (username, region) VALUES ($1, $2)
       ON CONFLICT (username) DO UPDATE SET region = COALESCE(EXCLUDED.region, players.region)
       RETURNING id`,
      [username, region],
    )
    const playerId = inserted[0]?.id
    if (!playerId) continue
    players++

    // HT/LT tiers.
    for (const t of p.tiers ?? []) {
      const gm = String(t.gamemode ?? "")
      if (!knownGamemodes.has(gm)) continue
      if (typeof t.points === "number") {
        await query(
          `INSERT INTO player_tiers (player_id, gamemode, tier, tier_type, raw_points)
           VALUES ($1, $2, 0, 'HT', $3)
           ON CONFLICT (player_id, gamemode) DO UPDATE SET raw_points = EXCLUDED.raw_points, tier = 0`,
          [playerId, gm, Math.round(t.points)],
        )
        tiers++
        continue
      }
      const tier = Number(t.tier)
      const tierType = t.tierType === "LT" ? "LT" : "HT"
      if (tier < 1 || tier > 5) continue
      await query(
        `INSERT INTO player_tiers (player_id, gamemode, tier, tier_type, raw_points)
         VALUES ($1, $2, $3, $4, NULL)
         ON CONFLICT (player_id, gamemode) DO UPDATE SET tier = EXCLUDED.tier, tier_type = EXCLUDED.tier_type, raw_points = NULL`,
        [playerId, gm, tier, tierType],
      )
      tiers++
    }

    // Explicit points array.
    for (const pt of p.points ?? []) {
      const gm = String(pt.gamemode ?? "")
      if (!knownGamemodes.has(gm) || typeof pt.points !== "number") continue
      await query(
        `INSERT INTO player_tiers (player_id, gamemode, tier, tier_type, raw_points)
         VALUES ($1, $2, 0, 'HT', $3)
         ON CONFLICT (player_id, gamemode) DO UPDATE SET raw_points = EXCLUDED.raw_points, tier = 0`,
        [playerId, gm, Math.round(pt.points)],
      )
      tiers++
    }
  }

  revalidatePath("/admin")
  revalidatePath("/")
  return { ok: true, message: `Imported ${players} player(s) and ${tiers} tier/point entr(ies).` }
}

// ----- Player skin uploads -----

export async function uploadPlayerSkin(formData: FormData) {
  await requireAdmin()
  const playerId = Number(formData.get("playerId"))
  const file = formData.get("skin")
  if (!playerId || !(file instanceof File) || file.size === 0) return

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
  await requireAdmin()
  const playerId = Number(formData.get("playerId"))
  if (!playerId) return
  await query(`UPDATE players SET skin_url = NULL, skin_source = NULL WHERE id = $1`, [playerId])
  revalidatePath("/admin")
  revalidatePath("/")
}
