"use server"

import { revalidatePath } from "next/cache"
import { put } from "@vercel/blob"
import { query } from "@/lib/db"
import { isAdmin, signInAdmin, signOutAdmin } from "@/lib/admin"
import { GAMEMODE_ICONS } from "@/lib/tiers"
import { COLOR_FIELDS, isValidHex, LOGO_URL_KEY, SITE_TITLE_KEY } from "@/lib/site-settings"

async function requireAdmin() {
  if (!(await isAdmin())) throw new Error("Unauthorized")
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
  await query(`INSERT INTO players (username, region) VALUES ($1, $2)`, [username, region])
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
    `INSERT INTO player_tiers (player_id, gamemode, tier, tier_type)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (player_id, gamemode)
     DO UPDATE SET tier = EXCLUDED.tier, tier_type = EXCLUDED.tier_type`,
    [playerId, gamemode, tier, tierType],
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
  if (!label) return

  let slug = slugify(label)
  if (!slug) return
  // Guarantee a unique slug even if the label repeats.
  const existing = await query<{ n: number }>(`SELECT COUNT(*)::int AS n FROM tierlists WHERE slug = $1`, [slug])
  if ((existing[0]?.n ?? 0) > 0) slug = `${slug}-${Date.now().toString(36)}`

  const rows = await query<{ max: number | null }>(`SELECT MAX(sort_order) AS max FROM tierlists`)
  const nextOrder = (rows[0]?.max ?? -1) + 1

  await query(`INSERT INTO tierlists (slug, label, sort_order) VALUES ($1, $2, $3)`, [slug, label, nextOrder])
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
  await requireAdmin()
  const id = Number(formData.get("id"))
  let icon = String(formData.get("icon") ?? "").trim()
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

const TITLE_COLORS = [
  "text-amber-400",
  "text-orange-400",
  "text-rose-400",
  "text-red-400",
  "text-red-300",
  "text-emerald-400",
  "text-sky-400",
  "text-muted-foreground",
]

export async function updateTitle(formData: FormData) {
  await requireAdmin()
  const id = Number(formData.get("id"))
  const name = String(formData.get("name") ?? "").trim()
  const min = Number(formData.get("min"))
  let className = String(formData.get("className") ?? "").trim()
  if (!id || !name || Number.isNaN(min)) return
  if (!TITLE_COLORS.includes(className)) className = "text-red-300"
  await query(`UPDATE titles SET name = $1, min_points = $2, class_name = $3 WHERE id = $4`, [
    name,
    min,
    className,
    id,
  ])
  revalidatePath("/admin")
  revalidatePath("/")
}

export async function createTitle(formData: FormData) {
  await requireAdmin()
  const name = String(formData.get("name") ?? "").trim()
  const min = Number(formData.get("min"))
  let className = String(formData.get("className") ?? "").trim()
  if (!name || Number.isNaN(min)) return
  if (!TITLE_COLORS.includes(className)) className = "text-red-300"
  await query(`INSERT INTO titles (name, min_points, class_name) VALUES ($1, $2, $3)`, [name, min, className])
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

// ----- Player skin uploads -----

export async function uploadPlayerSkin(formData: FormData) {
  await requireAdmin()
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
  await requireAdmin()
  const playerId = Number(formData.get("playerId"))
  if (!playerId) return
  await query(`UPDATE players SET skin_url = NULL, skin_source = NULL WHERE id = $1`, [playerId])
  revalidatePath("/admin")
  revalidatePath("/")
}

// ----- Site appearance settings -----

async function upsertSetting(key: string, value: string) {
  await query(
    `INSERT INTO site_settings (key, value, updated_at)
     VALUES ($1, $2, now())
     ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now()`,
    [key, value],
  )
}

// Saves the appearance form: site title + all theme colors. Only valid hex
// colors are stored; a blank color field clears that override (reverts to the
// built-in theme value).
export async function updateSiteSettings(formData: FormData) {
  await requireAdmin()

  const title = String(formData.get(SITE_TITLE_KEY) ?? "").trim()
  if (title) await upsertSetting(SITE_TITLE_KEY, title)

  for (const field of COLOR_FIELDS) {
    const raw = String(formData.get(field.dbKey) ?? "").trim()
    if (!raw) {
      // Blank => remove override so the default theme color is used again.
      await query(`DELETE FROM site_settings WHERE key = $1`, [field.dbKey])
      continue
    }
    if (isValidHex(raw)) await upsertSetting(field.dbKey, raw.toLowerCase())
  }

  revalidatePath("/admin")
  revalidatePath("/")
}

export async function uploadLogo(formData: FormData) {
  await requireAdmin()
  const file = formData.get("logo")
  if (!(file instanceof File) || file.size === 0) return
  const ext = (file.name.split(".").pop() || "png").toLowerCase()
  const blob = await put(`branding/logo-${Date.now()}.${ext}`, file, {
    access: "public",
    addRandomSuffix: true,
  })
  await upsertSetting(LOGO_URL_KEY, blob.url)
  revalidatePath("/admin")
  revalidatePath("/")
}

// Clears every saved appearance override, restoring the default logo, title,
// and theme colors.
export async function resetSiteSettings() {
  await requireAdmin()
  await query(`DELETE FROM site_settings`)
  revalidatePath("/admin")
  revalidatePath("/")
}
