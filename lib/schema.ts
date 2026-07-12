import "server-only"
import { query } from "./db"

// Ensures the multi-tierlist schema exists. Runs once per server instance.
// This is safe to call on every request path — the DDL is idempotent and the
// work is guarded behind a memoized promise so it only executes a single time.
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
  // Tier lists — each is its own independent board with its own point totals.
  await query(`
    CREATE TABLE IF NOT EXISTS tierlists (
      id SERIAL PRIMARY KEY,
      slug TEXT UNIQUE NOT NULL,
      label TEXT NOT NULL,
      sort_order INTEGER NOT NULL DEFAULT 0
    )
  `)

  // Gamemodes get a tierlist_id so each belongs to exactly one tier list.
  await query(`ALTER TABLE gamemodes ADD COLUMN IF NOT EXISTS tierlist_id INTEGER`)

  // Seed the default "Main Tier" list if none exist.
  const existing = await query<{ n: number }>(`SELECT COUNT(*)::int AS n FROM tierlists`)
  if ((existing[0]?.n ?? 0) === 0) {
    await query(`INSERT INTO tierlists (slug, label, sort_order) VALUES ('main', 'Main Tier', 0)`)
    // Add a second empty "Subtiers" list out of the box.
    await query(`INSERT INTO tierlists (slug, label, sort_order) VALUES ('subtiers', 'Subtiers', 1)`)
  }

  // Backfill: any gamemode without a tier list is assigned to the first (Main) list.
  const main = await query<{ id: number }>(`SELECT id FROM tierlists ORDER BY sort_order ASC, id ASC LIMIT 1`)
  const mainId = main[0]?.id
  if (mainId) {
    await query(`UPDATE gamemodes SET tierlist_id = $1 WHERE tierlist_id IS NULL`, [mainId])
  }

  // Site appearance settings — simple key/value store for logo, title, and
  // theme colors configured from the admin panel.
  await query(`
    CREATE TABLE IF NOT EXISTS site_settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `)
}
