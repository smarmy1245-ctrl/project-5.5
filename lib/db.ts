import { Pool } from "@neondatabase/serverless"

// Resolve the Neon connection string. Support the common env var names that the
// Neon/Vercel integration may provide so we never silently fall back to a local
// Postgres on 127.0.0.1:5432.
const connectionString =
  process.env.DATABASE_URL ??
  process.env.POSTGRES_URL ??
  process.env.DATABASE_URL_UNPOOLED ??
  process.env.POSTGRES_URL_NON_POOLING

if (!connectionString) {
  throw new Error(
    "No database connection string found. Set DATABASE_URL (or POSTGRES_URL) from the Neon integration.",
  )
}

// Single shared Pool reused across hot reloads in dev. The Neon serverless
// driver speaks to Neon over a secure WebSocket connection and handles SSL
// automatically, so there is no localhost/SSL fallback to worry about.
const globalForPool = globalThis as unknown as { neonPool?: Pool }

export const pool = globalForPool.neonPool ?? new Pool({ connectionString })

if (process.env.NODE_ENV !== "production") {
  globalForPool.neonPool = pool
}

export async function query<T = any>(text: string, params?: any[]): Promise<T[]> {
  const res = await pool.query(text, params)
  return res.rows as T[]
}
