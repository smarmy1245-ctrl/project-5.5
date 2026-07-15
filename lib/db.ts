import { Pool } from "pg"

// Single shared pg Pool reused across hot reloads in dev.
const globalForPool = globalThis as unknown as { pgPool?: Pool }

function createPool(): Pool {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    max: 5,
    // Neon closes idle connections aggressively. Keep them fresh and don't let
    // a single stale socket linger long enough to blow up mid-query.
    idleTimeoutMillis: 10_000,
    keepAlive: true,
    connectionTimeoutMillis: 10_000,
  })

  // CRITICAL: pg emits 'error' on idle clients when the server (Neon) drops the
  // connection. With no listener this becomes an uncaught exception that crashes
  // the whole Node process — which is exactly what forces the "reload" screen.
  // Swallow it here; the pool transparently creates a new connection next query.
  pool.on("error", (err) => {
    console.log("[v0] pg pool idle client error (recovered):", err.message)
  })

  return pool
}

export const pool = globalForPool.pgPool ?? createPool()

if (process.env.NODE_ENV !== "production") {
  globalForPool.pgPool = pool
}

// Transient connection errors (idle socket closed by Neon, etc.) are safe to
// retry once — the pool will hand us a brand new connection.
function isTransient(err: unknown): boolean {
  const code = (err as { code?: string })?.code
  const msg = (err as { message?: string })?.message ?? ""
  return (
    code === "ECONNRESET" ||
    code === "EPIPE" ||
    code === "ETIMEDOUT" ||
    code === "57P01" || // admin_shutdown
    code === "08006" || // connection_failure
    code === "08003" || // connection_does_not_exist
    /Connection terminated|timeout|socket hang up/i.test(msg)
  )
}

export async function query<T = any>(text: string, params?: any[]): Promise<T[]> {
  try {
    const res = await pool.query(text, params)
    return res.rows as T[]
  } catch (err) {
    if (isTransient(err)) {
      console.log("[v0] query retry after transient error:", (err as Error).message)
      const res = await pool.query(text, params)
      return res.rows as T[]
    }
    throw err
  }
}
