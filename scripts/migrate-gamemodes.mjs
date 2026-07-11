import { Pool } from "pg"

const pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 3 })

async function main() {
  // Gamemodes are now configurable from the admin panel.
  await pool.query(`
    CREATE TABLE IF NOT EXISTS gamemodes (
      id SERIAL PRIMARY KEY,
      slug TEXT UNIQUE NOT NULL,
      label TEXT NOT NULL,
      icon TEXT NOT NULL DEFAULT 'sword',
      sort_order INTEGER NOT NULL DEFAULT 0
    )
  `)

  // Seed the default "Friendship" gamemode if the table is empty.
  const { rows } = await pool.query(`SELECT COUNT(*)::int AS n FROM gamemodes`)
  if (rows[0].n === 0) {
    await pool.query(
      `INSERT INTO gamemodes (slug, label, icon, sort_order) VALUES ($1, $2, $3, $4)`,
      ["friendship", "Friendship", "heart", 0],
    )
    console.log("Seeded default gamemode: Friendship")
  }

  // Clear the player list so it can be repopulated from the admin panel.
  await pool.query(`DELETE FROM player_tiers`)
  await pool.query(`DELETE FROM players`)
  console.log("Cleared all players and tiers.")

  console.log("Migration complete.")
  await pool.end()
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
