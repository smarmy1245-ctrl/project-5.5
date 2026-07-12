import { AdminLogin } from "@/components/admin-login"
import { AdminPanel } from "@/components/admin-panel"
import { isAdmin } from "@/lib/admin"
import { getGamemodes, getPlayers, getSiteSettings, getTierlists, getTitles } from "@/lib/data"

export const dynamic = "force-dynamic"

export const metadata = {
  robots: { index: false, follow: false },
}

export default async function AdminPage() {
  if (!(await isAdmin())) {
    return <AdminLogin />
  }

  const [players, gamemodes, titles, tierlists, settings] = await Promise.all([
    getPlayers(),
    getGamemodes(),
    getTitles(),
    getTierlists(),
    getSiteSettings(),
  ])
  const sorted = [...players].sort((a, b) => a.username.localeCompare(b.username))

  return (
    <AdminPanel
      players={sorted}
      gamemodes={gamemodes}
      titles={titles}
      tierlists={tierlists}
      settings={settings}
    />
  )
}
