import { Pool } from "pg"

const pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 3 })

async function main() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS tierlists (
      id SERIAL PRIMARY KEY,
      slug TEXT UNIQUE NOT NULL,
      label TEXT NOT NULL,
      sort_order INT NOT NULL DEFAULT 0
    );
  `)

  await pool.query(`
    CREATE TABLE IF NOT EXISTS gamemodes (
      id SERIAL PRIMARY KEY,
      slug TEXT UNIQUE NOT NULL,
      label TEXT NOT NULL,
      icon TEXT NOT NULL DEFAULT 'sword',
      sort_order INT NOT NULL DEFAULT 0,
      tierlist_id INT
    );
  `)
  await pool.query(`ALTER TABLE gamemodes ADD COLUMN IF NOT EXISTS tierlist_id INT;`)

  // Seed the default tier lists (Main Tier + an empty Subtiers) if none exist.
  const tlCount = (await pool.query("SELECT COUNT(*)::int AS n FROM tierlists")).rows[0].n
  if (tlCount === 0) {
    await pool.query("INSERT INTO tierlists (slug, label, sort_order) VALUES ('main','Main Tier',0)")
    await pool.query("INSERT INTO tierlists (slug, label, sort_order) VALUES ('subtiers','Subtiers',1)")
    console.log("Seeded 2 tier lists")
  }
  const mainId = (await pool.query("SELECT id FROM tierlists ORDER BY sort_order ASC, id ASC LIMIT 1")).rows[0].id
  await pool.query("UPDATE gamemodes SET tierlist_id = $1 WHERE tierlist_id IS NULL", [mainId])

  await pool.query(`
    CREATE TABLE IF NOT EXISTS players (
      id SERIAL PRIMARY KEY,
      username TEXT NOT NULL UNIQUE,
      region TEXT,
      skin_url TEXT,
      skin_source TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `)
  // Ensure skin columns exist if the table predates them.
  await pool.query(`ALTER TABLE players ADD COLUMN IF NOT EXISTS skin_url TEXT;`)
  await pool.query(`ALTER TABLE players ADD COLUMN IF NOT EXISTS skin_source TEXT;`)

  await pool.query(`
    CREATE TABLE IF NOT EXISTS player_tiers (
      id SERIAL PRIMARY KEY,
      player_id INTEGER NOT NULL REFERENCES players(id) ON DELETE CASCADE,
      gamemode TEXT NOT NULL,
      tier INTEGER NOT NULL,
      tier_type TEXT NOT NULL,
      UNIQUE (player_id, gamemode)
    );
  `)

  await pool.query(`
    CREATE TABLE IF NOT EXISTS titles (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      min_points INT NOT NULL,
      class_name TEXT NOT NULL DEFAULT 'text-red-300',
      sort_order INT NOT NULL DEFAULT 0
    );
  `)

  // ----- Seed gamemodes (only if empty) -----
  const gmCount = (await pool.query("SELECT COUNT(*)::int AS n FROM gamemodes")).rows[0].n
  if (gmCount === 0) {
    const gms = [
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
      await pool.query(
        "INSERT INTO gamemodes (slug, label, icon, sort_order, tierlist_id) VALUES ($1,$2,$3,$4,$5)",
        [slug, label, icon, i++, mainId],
      )
    }
    console.log("Seeded", gms.length, "gamemodes")
  }

  // ----- Seed titles (only if empty) -----
  const titleCount = (await pool.query("SELECT COUNT(*)::int AS n FROM titles")).rows[0].n
  if (titleCount === 0) {
    const titles = [
      ["SMARMY'S GRANDMASTER", 400, "text-amber-400"],
      ["SMARMY'S MASTER", 250, "text-orange-400"],
      ["SMARMY'S ACE", 100, "text-rose-400"],
      ["SMARMY'S SPECIALIST", 50, "text-red-400"],
      ["SMARMY'S CADET", 10, "text-red-300"],
      ["SMARMY'S ROOKIE", 1, "text-muted-foreground"],
    ]
    let i = 0
    for (const [name, min, cls] of titles) {
      await pool.query("INSERT INTO titles (name, min_points, class_name, sort_order) VALUES ($1,$2,$3,$4)", [
        name,
        min,
        cls,
        i++,
      ])
    }
    console.log("Seeded", titles.length, "titles")
  }

  // ----- Seed demo players (only if empty) -----
  const playerCount = (await pool.query("SELECT COUNT(*)::int AS n FROM players")).rows[0].n
  if (playerCount === 0) {
    const demo = [
      {
        username: "ItzRealMe",
        region: "NA",
        tiers: [
          ["sword", 1, "HT"],
          ["vanilla", 1, "HT"],
          ["uhc", 1, "HT"],
          ["pot", 1, "HT"],
          ["nethpot", 1, "HT"],
          ["axe", 2, "LT"],
          ["mace", 2, "LT"],
          ["smp", 2, "LT"],
        ],
      },
      {
        username: "coldified",
        region: "NA",
        tiers: [
          ["sword", 1, "HT"],
          ["vanilla", 1, "HT"],
          ["uhc", 1, "HT"],
          ["pot", 2, "HT"],
          ["nethpot", 2, "HT"],
          ["axe", 3, "LT"],
        ],
      },
      {
        username: "Swight",
        region: "NA",
        tiers: [
          ["sword", 1, "HT"],
          ["vanilla", 2, "HT"],
          ["uhc", 2, "HT"],
          ["pot", 2, "LT"],
          ["nethpot", 3, "LT"],
        ],
      },
    ]
    for (const p of demo) {
      const r = await pool.query("INSERT INTO players (username, region) VALUES ($1,$2) RETURNING id", [
        p.username,
        p.region,
      ])
      for (const [gm, tier, type] of p.tiers) {
        await pool.query(
          "INSERT INTO player_tiers (player_id, gamemode, tier, tier_type) VALUES ($1,$2,$3,$4)",
          [r.rows[0].id, gm, tier, type],
        )
      }
    }
    console.log("Seeded", demo.length, "demo players")
  }

  console.log("DB initialized.")
  await pool.end()
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
