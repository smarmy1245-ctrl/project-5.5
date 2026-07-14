import { Leaderboard } from "@/components/leaderboard"
import { SiteHeader } from "@/components/site-header"
import { getGamemodes, getPlayers, getThemeColors, getTierlists, getTitles } from "@/lib/data"

export const dynamic = "force-dynamic"

export default async function HomePage() {
  const [tierlists, gamemodes, players, titles, themeColors] = await Promise.all([
    getTierlists(),
    getGamemodes(),
    getPlayers(),
    getTitles(),
    getThemeColors(),
  ])

  return (
    <main className="min-h-dvh">
      <SiteHeader titles={titles} themeColors={themeColors} />
      <div className="mx-auto max-w-2xl px-4 py-6 lg:max-w-7xl lg:px-8 lg:py-8">
        <Leaderboard
          tierlists={tierlists}
          gamemodes={gamemodes}
          players={players}
          titles={titles}
          themeColors={themeColors}
        />
      </div>
    </main>
  )
}
