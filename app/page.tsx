import { Leaderboard } from "@/components/leaderboard"
import { SiteHeader } from "@/components/site-header"
import { getGamemodes, getPlayers, getTierlists, getTitles } from "@/lib/data"

export const dynamic = "force-dynamic"

export default async function HomePage() {
  const [tierlists, gamemodes, players, titles] = await Promise.all([
    getTierlists(),
    getGamemodes(),
    getPlayers(),
    getTitles(),
  ])

  return (
    <main className="min-h-dvh">
      <SiteHeader titles={titles} />
      <div className="mx-auto max-w-2xl px-4 py-6 lg:max-w-7xl lg:px-8 lg:py-8">
        <Leaderboard
          tierlists={tierlists}
          gamemodes={gamemodes}
          players={players}
          titles={titles}
        />
      </div>
    </main>
  )
}
