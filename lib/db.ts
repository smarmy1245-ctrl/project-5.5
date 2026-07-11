import { Pool } from "pg"

// Single shared pg Pool reused across hot reloads in dev.
const globalForPool = globalThis as unknown as { pgPool?: Pool }

export const pool =
  globalForPool.pgPool ??
  new Pool({
    connectionString: process.env.DATABASE_URL,
    max: 5,
  })

if (process.env.NODE_ENV !== "production") {
  globalForPool.pgPool = pool
}

export async function query<T = any>(text: string, params?: any[]): Promise<T[]> {
  const res = await pool.query(text, params)
  return res.rows as T[]
}
