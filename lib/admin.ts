import "server-only"
import { cookies } from "next/headers"
import { createHash } from "crypto"

const COOKIE_NAME = "smarmy_admin"

// The secret code that unlocks the admin panel.
// Set ADMIN_CODE in project env vars to change it.
export function getAdminCode(): string {
  return process.env.ADMIN_CODE ?? "Allrathasushainemyat2010@"
}

function tokenFor(code: string): string {
  return createHash("sha256").update(`smarmy:${code}`).digest("hex")
}

export async function isAdmin(): Promise<boolean> {
  const store = await cookies()
  const token = store.get(COOKIE_NAME)?.value
  return !!token && token === tokenFor(getAdminCode())
}

export async function signInAdmin(code: string): Promise<boolean> {
  if (code !== getAdminCode()) return false
  const store = await cookies()
  store.set(COOKIE_NAME, tokenFor(code), {
    httpOnly: true,
    sameSite: "none",
    secure: true,
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  })
  return true
}

export async function signOutAdmin(): Promise<void> {
  const store = await cookies()
  store.delete(COOKIE_NAME)
}
