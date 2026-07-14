import "server-only"
import { query } from "./db"
import { DEFAULT_HT_COLOR, DEFAULT_LT_COLOR, DEFAULT_TIER_COLORS } from "./tiers"

// Ensures the full schema exists. Runs once per server instance.
// Every statement is idempotent, so this is safe to call on every request path.
// This is what makes the app self-heal on a brand new database — the public
// pages no longer crash into a reload loop when tables are missing.
let ensured: Promise<void> | null = null

export function ensureSchema(): Promise<void> {
  if (!ensured) {
    ensured = migrate().catch((e) => {
      // Reset so a later request can retry if the first attempt failed.
      ensured = null
      throw e
    })
  }
  return ensured
}

async function migrate(): Promise<void> {
  // ----- Core tables (create if the database is empty) -----
  await query(`
    CREATE TABLE IF NOT EXISTS tierlists (
      id SERIAL PRIMARY KEY,
      slug TEXT UNIQUE NOT NULL,
      label TEXT NOT NULL,
      sort_order INTEGER NOT NULL DEFAULT 0,
      mode TEXT NOT NULL DEFAULT 'tier'
    )
  `)
  // 'tier' (HT/LT) or 'points' (raw point numbers).
  await query(`ALTER TABLE tierlists ADD COLUMN IF NOT EXISTS mode TEXT NOT NULL DEFAULT 'tier'`)

  await query(`
    CREATE TABLE IF NOT EXISTS gamemodes (
      id SERIAL PRIMARY KEY,
      slug TEXT UNIQUE NOT NULL,
      label TEXT NOT NULL,
      icon TEXT NOT NULL DEFAULT 'sword',
      sort_order INTEGER NOT NULL DEFAULT 0,
      tierlist_id INTEGER,
      color TEXT
    )
  `)
  await query(`ALTER TABLE gamemodes ADD COLUMN IF NOT EXISTS tierlist_id INTEGER`)
  await query(`ALTER TABLE gamemodes ADD COLUMN IF NOT EXISTS color TEXT`)

  await query(`
    CREATE TABLE IF NOT EXISTS players (
      id SERIAL PRIMARY KEY,
      username TEXT NOT NULL UNIQUE,
      region TEXT,
      skin_url TEXT,
      skin_source TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `)
  await query(`ALTER TABLE players ADD COLUMN IF NOT EXISTS skin_url TEXT`)
  await query(`ALTER TABLE players ADD COLUMN IF NOT EXISTS skin_source TEXT`)

  await query(`
    CREATE TABLE IF NOT EXISTS player_tiers (
      id SERIAL PRIMARY KEY,
      player_id INTEGER NOT NULL REFERENCES players(id) ON DELETE CASCADE,
      gamemode TEXT NOT NULL,
      tier INTEGER NOT NULL DEFAULT 0,
      tier_type TEXT NOT NULL DEFAULT 'HT',
      raw_points INTEGER,
      UNIQUE (player_id, gamemode)
    )
  `)
  // raw_points holds the admin-entered number for points-mode tier lists.
  await query(`ALTER TABLE player_tiers ADD COLUMN IF NOT EXISTS raw_points INTEGER`)

  await query(`
    CREATE TABLE IF NOT EXISTS titles (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      min_points INTEGER NOT NULL,
      class_name TEXT NOT NULL DEFAULT 'text-red-300',
      color TEXT,
      sort_order INTEGER NOT NULL DEFAULT 0
    )
  `)
  await query(`ALTER TABLE titles ADD COLUMN IF NOT EXISTS color TEXT`)

  // Per-tier colors (1-5) controlled by the admin color wheel.
  await query(`
    CREATE TABLE IF NOT EXISTS tier_colors (
      tier INTEGER PRIMARY KEY,
      color TEXT NOT NULL
    )
  `)

  // Generic key/value store for theme colors (HT/LT accents, etc.).
  await query(`
    CREATE TABLE IF NOT EXISTS app_settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    )
  `)

  // ----- Seed default tier lists -----
  const tlCount = await query<{ n: number }>(`SELECT COUNT(*)::int AS n FROM tierlists`)
  if ((tlCount[0]?.n ?? 0) === 0) {
    await query(`INSERT INTO tierlists (slug, label, sort_order, mode) VALUES ('main', 'Main Tier', 0, 'tier')`)
    await query(`INSERT INTO tierlists (slug, label, sort_order, mode) VALUES ('subtiers', 'Subtiers', 1, 'tier')`)
  }

  // Backfill: any gamemode without a tier list is assigned to the first (Main) list.
  const main = await query<{ id: number }>(`SELECT id FROM tierlists ORDER BY sort_order ASC, id ASC LIMIT 1`)
  const mainId = main[0]?.id
  if (mainId) {
    await query(`UPDATE gamemodes SET tierlist_id = $1 WHERE tierlist_id IS NULL`, [mainId])
  }

  // ----- Seed default gamemodes -----
  if (mainId) {
    const gmCount = await query<{ n: number }>(`SELECT COUNT(*)::int AS n FROM gamemodes`)
    if ((gmCount[0]?.n ?? 0) === 0) {
      const gms: [string, string, string][] = [
        ["sword", "Sword", "sword"],
        ["vanilla", "Vanilla", "gem"],
        ["uhc", "UHC", "heart"],
        ["pot", "Pot", "flame"],
        ["nethpot", "NethPot", "zap"],
        ["smp", "SMP", "shield"],
        ["axe", "Axe", "axe"],
        ["mace", "Mace", "mace"],
      ]
      let i = 0
      for (const [slug, label, icon] of gms) {
        await query(
          `INSERT INTO gamemodes (slug, label, icon, sort_order, tierlist_id) VALUES ($1, $2, $3, $4, $5)`,
          [slug, label, icon, i++, mainId],
        )
      }
    }
  }

  // ----- Seed default titles -----
  const titleCount = await query<{ n: number }>(`SELECT COUNT(*)::int AS n FROM titles`)
  if ((titleCount[0]?.n ?? 0) === 0) {
    const titles: [string, number, string, string | null][] = [
      ["SMARMY'S GRANDMASTER", 400, "text-amber-400", "#fbbf24"],
      ["SMARMY'S MASTER", 250, "text-orange-400", "#fb923c"],
      ["SMARMY'S ACE", 100, "text-rose-400", "#fb7185"],
      ["SMARMY'S SPECIALIST", 50, "text-red-400", "#f87171"],
      ["SMARMY'S CADET", 10, "text-red-300", "#fca5a5"],
      ["SMARMY'S ROOKIE", 1, "text-muted-foreground", null],
    ]
    let i = 0
    for (const [name, min, cls, color] of titles) {
      await query(`INSERT INTO titles (name, min_points, class_name, color, sort_order) VALUES ($1, $2, $3, $4, $5)`, [
        name,
        min,
        cls,
        color,
        i++,
      ])
    }
  }

  // ----- Seed default tier colors -----
  const tcCount = await query<{ n: number }>(`SELECT COUNT(*)::int AS n FROM tier_colors`)
  if ((tcCount[0]?.n ?? 0) === 0) {
    for (const [tier, color] of Object.entries(DEFAULT_TIER_COLORS)) {
      await query(`INSERT INTO tier_colors (tier, color) VALUES ($1, $2) ON CONFLICT (tier) DO NOTHING`, [
        Number(tier),
        color,
      ])
    }
  }

  // ----- Seed default theme settings -----
  await query(`INSERT INTO app_settings (key, value) VALUES ('ht_color', $1) ON CONFLICT (key) DO NOTHING`, [
    DEFAULT_HT_COLOR,
  ])
  await query(`INSERT INTO app_settings (key, value) VALUES ('lt_color', $1) ON CONFLICT (key) DO NOTHING`, [
    DEFAULT_LT_COLOR,
  ])
}
