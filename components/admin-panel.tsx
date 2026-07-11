import { ImageUp, Layers, LogOut, Plus, Trash2 } from "lucide-react"
import type { Player, TitleRow } from "@/lib/data"
import { GAMEMODE_ICON_OPTIONS, gamemodeIcon, type Gamemode, type Tierlist, tierLabel } from "@/lib/tiers"
import { PlayerSkin } from "./player-skin"
import { cn } from "@/lib/utils"
import {
  createGamemode,
  createPlayer,
  createTierlist,
  createTitle,
  deleteGamemode,
  deletePlayer,
  deleteTierlist,
  deleteTitle,
  logoutAction,
  moveGamemode,
  removePlayerSkin,
  removeTier,
  setTier,
  updateGamemodeIcon,
  updateTitle,
  uploadPlayerSkin,
} from "@/app/actions/admin"

const TITLE_COLOR_OPTIONS = [
  "text-amber-400",
  "text-orange-400",
  "text-rose-400",
  "text-red-400",
  "text-red-300",
  "text-emerald-400",
  "text-sky-400",
  "text-muted-foreground",
]

function TierEditor({
  player,
  gamemodes,
  tierlists,
}: {
  player: Player
  gamemodes: Gamemode[]
  tierlists: Tierlist[]
}) {
  return (
    <div className="mt-3 flex flex-col gap-3 border-t border-border pt-3">
      {tierlists.map((tl) => {
        const listGamemodes = gamemodes.filter((gm) => gm.tierlistId === tl.id)
        if (listGamemodes.length === 0) return null
        return (
          <div key={tl.id} className="flex flex-col gap-2">
            <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-primary">
              <Layers className="h-3.5 w-3.5" aria-hidden="true" />
              {tl.label}
            </p>
            {listGamemodes.map((gm) => {
              const current = player.tiers.find((t) => t.gamemode === gm.slug)
              return (
                <div key={gm.id} className="flex flex-wrap items-center gap-2">
            <span className="w-24 text-sm font-semibold text-foreground">{gm.label}</span>

            <form action={setTier} className="flex flex-wrap items-center gap-2">
              <input type="hidden" name="playerId" value={player.id} />
              <input type="hidden" name="gamemode" value={gm.slug} />
              <select
                name="tierType"
                defaultValue={current?.tierType ?? "HT"}
                className="min-h-9 cursor-pointer rounded-md border border-border bg-background px-2 text-sm text-foreground"
                aria-label={`${gm.label} tier type`}
              >
                <option value="HT">HT</option>
                <option value="LT">LT</option>
              </select>
              <select
                name="tier"
                defaultValue={current?.tier ?? 3}
                className="min-h-9 cursor-pointer rounded-md border border-border bg-background px-2 text-sm text-foreground"
                aria-label={`${gm.label} tier number`}
              >
                {[1, 2, 3, 4, 5].map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
              <button
                type="submit"
                className="min-h-9 cursor-pointer rounded-md bg-primary px-3 text-sm font-bold text-primary-foreground"
              >
                {current ? "Update" : "Set"}
              </button>
            </form>

            {current && (
              <>
                <span className="rounded border border-border bg-secondary px-2 py-1 font-mono text-xs text-foreground">
                  {tierLabel(current.tier, current.tierType)} · {current.points} pts
                </span>
                <form action={removeTier}>
                  <input type="hidden" name="playerId" value={player.id} />
                  <input type="hidden" name="gamemode" value={gm.slug} />
                  <button
                    type="submit"
                    aria-label={`Remove ${gm.label} tier`}
                    className="flex min-h-9 cursor-pointer items-center rounded-md border border-border px-2 text-muted-foreground hover:text-primary"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </form>
              </>
            )}
                </div>
              )
            })}
          </div>
        )
      })}
    </div>
  )
}

function TierlistManager({ tierlists }: { tierlists: Tierlist[] }) {
  return (
    <section className="mb-6 rounded-xl border border-border bg-card p-4">
      <h2 className="mb-1 text-sm font-bold uppercase tracking-wide text-muted-foreground">Tier lists</h2>
      <p className="mb-3 text-xs text-muted-foreground">
        Each tier list is its own board with its own points — totals are never combined across lists.
      </p>

      <ul className="mb-3 flex flex-col gap-2">
        {tierlists.map((tl) => (
          <li
            key={tl.id}
            className="flex flex-wrap items-center gap-2 rounded-lg border border-border bg-background px-3 py-2"
          >
            <Layers className="h-5 w-5 text-primary" aria-hidden="true" />
            <span className="flex-1 font-bold font-display text-foreground">{tl.label}</span>
            {tierlists.length > 1 && (
              <form action={deleteTierlist}>
                <input type="hidden" name="id" value={tl.id} />
                <button
                  type="submit"
                  aria-label={`Delete ${tl.label}`}
                  className="flex min-h-9 cursor-pointer items-center rounded-md border border-border px-2 text-muted-foreground hover:text-primary"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </form>
            )}
          </li>
        ))}
        {tierlists.length === 0 && <li className="text-sm text-muted-foreground">No tier lists yet.</li>}
      </ul>

      <form action={createTierlist} className="flex flex-wrap items-center gap-2 border-t border-border pt-3">
        <input
          name="label"
          placeholder="Tier list name (e.g. Subtiers)"
          required
          className="min-h-11 flex-1 rounded-lg border border-border bg-background px-3 text-base text-foreground outline-none focus:border-primary"
        />
        <button
          type="submit"
          className="flex min-h-11 cursor-pointer items-center gap-2 rounded-lg bg-primary px-4 font-bold text-primary-foreground"
        >
          <Plus className="h-4 w-4" />
          Add
        </button>
      </form>
    </section>
  )
}

function GamemodeManager({ gamemodes, tierlists }: { gamemodes: Gamemode[]; tierlists: Tierlist[] }) {
  return (
    <section className="mb-6 rounded-xl border border-border bg-card p-4">
      <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-muted-foreground">Gamemodes</h2>

      <div className="mb-3 flex flex-col gap-4">
        {tierlists.map((tl) => {
          const listGamemodes = gamemodes.filter((gm) => gm.tierlistId === tl.id)
          return (
            <div key={tl.id} className="flex flex-col gap-2">
              <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-primary">
                <Layers className="h-3.5 w-3.5" aria-hidden="true" />
                {tl.label}
              </p>
              <ul className="flex flex-col gap-2">
                {listGamemodes.map((gm) => {
                  const Icon = gamemodeIcon(gm.icon)
                  return (
                    <li
                      key={gm.id}
                      className="flex flex-wrap items-center gap-2 rounded-lg border border-border bg-background px-3 py-2"
                    >
                      <Icon className="h-5 w-5 text-primary" aria-hidden="true" />
                      <span className="flex-1 text-sm font-semibold text-foreground">{gm.label}</span>

                      <form action={updateGamemodeIcon} className="flex items-center gap-2">
                        <input type="hidden" name="id" value={gm.id} />
                        <select
                          name="icon"
                          defaultValue={gm.icon}
                          className="min-h-9 cursor-pointer rounded-md border border-border bg-background px-2 text-sm text-foreground"
                          aria-label={`${gm.label} icon`}
                        >
                          {GAMEMODE_ICON_OPTIONS.map((opt) => (
                            <option key={opt} value={opt}>
                              {opt}
                            </option>
                          ))}
                        </select>
                        <button
                          type="submit"
                          className="min-h-9 cursor-pointer rounded-md border border-border px-3 text-sm font-bold text-foreground hover:border-primary"
                        >
                          Save
                        </button>
                      </form>

                      {tierlists.length > 1 && (
                        <form action={moveGamemode} className="flex items-center gap-2">
                          <input type="hidden" name="id" value={gm.id} />
                          <select
                            name="tierlistId"
                            defaultValue={gm.tierlistId}
                            className="min-h-9 cursor-pointer rounded-md border border-border bg-background px-2 text-sm text-foreground"
                            aria-label={`${gm.label} tier list`}
                          >
                            {tierlists.map((opt) => (
                              <option key={opt.id} value={opt.id}>
                                {opt.label}
                              </option>
                            ))}
                          </select>
                          <button
                            type="submit"
                            className="min-h-9 cursor-pointer rounded-md border border-border px-3 text-sm font-bold text-foreground hover:border-primary"
                          >
                            Move
                          </button>
                        </form>
                      )}

                      <form action={deleteGamemode}>
                        <input type="hidden" name="id" value={gm.id} />
                        <button
                          type="submit"
                          aria-label={`Delete ${gm.label}`}
                          className="flex min-h-9 cursor-pointer items-center rounded-md border border-border px-2 text-muted-foreground hover:text-primary"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </form>
                    </li>
                  )
                })}
                {listGamemodes.length === 0 && (
                  <li className="text-sm text-muted-foreground">No gamemodes in this list yet.</li>
                )}
              </ul>
            </div>
          )
        })}
      </div>

      <form action={createGamemode} className="flex flex-wrap items-center gap-2 border-t border-border pt-3">
        <input
          name="label"
          placeholder="Gamemode name (e.g. Sword)"
          required
          className="min-h-11 flex-1 rounded-lg border border-border bg-background px-3 text-base text-foreground outline-none focus:border-primary"
        />
        <select
          name="tierlistId"
          defaultValue={tierlists[0]?.id}
          className="min-h-11 cursor-pointer rounded-lg border border-border bg-background px-3 text-base text-foreground"
          aria-label="New gamemode tier list"
        >
          {tierlists.map((tl) => (
            <option key={tl.id} value={tl.id}>
              {tl.label}
            </option>
          ))}
        </select>
        <select
          name="icon"
          defaultValue="sword"
          className="min-h-11 cursor-pointer rounded-lg border border-border bg-background px-3 text-base text-foreground"
          aria-label="New gamemode icon"
        >
          {GAMEMODE_ICON_OPTIONS.map((opt) => (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ))}
        </select>
        <button
          type="submit"
          className="flex min-h-11 cursor-pointer items-center gap-2 rounded-lg bg-primary px-4 font-bold text-primary-foreground"
        >
          <Plus className="h-4 w-4" />
          Add
        </button>
      </form>
    </section>
  )
}

function TitleManager({ titles }: { titles: TitleRow[] }) {
  return (
    <section className="mb-6 rounded-xl border border-border bg-card p-4">
      <h2 className="mb-1 text-sm font-bold uppercase tracking-wide text-muted-foreground">Titles</h2>
      <p className="mb-3 text-xs text-muted-foreground">
        Rename ranks (e.g. Grandmaster) and set the point threshold + color for each.
      </p>

      <ul className="mb-3 flex flex-col gap-2">
        {titles.map((t) => (
          <li key={t.id} className="rounded-lg border border-border bg-background p-3">
            <form action={updateTitle} className="flex flex-wrap items-end gap-2">
              <input type="hidden" name="id" value={t.id} />
              <label className="flex flex-1 flex-col gap-1">
                <span className="text-xs font-semibold text-muted-foreground">Title</span>
                <input
                  name="name"
                  defaultValue={t.name}
                  required
                  className={cn(
                    "min-h-10 w-full rounded-md border border-border bg-card px-2 text-base font-bold outline-none focus:border-primary",
                    t.className,
                  )}
                />
              </label>
              <label className="flex w-24 flex-col gap-1">
                <span className="text-xs font-semibold text-muted-foreground">Min pts</span>
                <input
                  name="min"
                  type="number"
                  defaultValue={t.min}
                  required
                  className="min-h-10 w-full rounded-md border border-border bg-card px-2 text-base text-foreground outline-none focus:border-primary"
                />
              </label>
              <label className="flex w-36 flex-col gap-1">
                <span className="text-xs font-semibold text-muted-foreground">Color</span>
                <select
                  name="className"
                  defaultValue={t.className}
                  className="min-h-10 w-full cursor-pointer rounded-md border border-border bg-card px-2 text-sm text-foreground"
                  aria-label={`${t.name} color`}
                >
                  {TITLE_COLOR_OPTIONS.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt.replace("text-", "")}
                    </option>
                  ))}
                </select>
              </label>
              <button
                type="submit"
                className="min-h-10 cursor-pointer rounded-md bg-primary px-3 text-sm font-bold text-primary-foreground"
              >
                Save
              </button>
            </form>
            <form action={deleteTitle} className="mt-2">
              <input type="hidden" name="id" value={t.id} />
              <button
                type="submit"
                className="cursor-pointer text-xs font-semibold text-muted-foreground hover:text-primary"
              >
                Delete title
              </button>
            </form>
          </li>
        ))}
        {titles.length === 0 && <li className="text-sm text-muted-foreground">No titles yet.</li>}
      </ul>

      <form action={createTitle} className="flex flex-wrap items-end gap-2 border-t border-border pt-3">
        <label className="flex flex-1 flex-col gap-1">
          <span className="text-xs font-semibold text-muted-foreground">New title</span>
          <input
            name="name"
            placeholder="e.g. SMARMY'S LEGEND"
            required
            className="min-h-11 w-full rounded-lg border border-border bg-background px-3 text-base text-foreground outline-none focus:border-primary"
          />
        </label>
        <label className="flex w-24 flex-col gap-1">
          <span className="text-xs font-semibold text-muted-foreground">Min pts</span>
          <input
            name="min"
            type="number"
            defaultValue={0}
            required
            className="min-h-11 w-full rounded-lg border border-border bg-background px-3 text-base text-foreground outline-none focus:border-primary"
          />
        </label>
        <label className="flex w-36 flex-col gap-1">
          <span className="text-xs font-semibold text-muted-foreground">Color</span>
          <select
            name="className"
            defaultValue="text-red-300"
            className="min-h-11 w-full cursor-pointer rounded-lg border border-border bg-background px-3 text-base text-foreground"
            aria-label="New title color"
          >
            {TITLE_COLOR_OPTIONS.map((opt) => (
              <option key={opt} value={opt}>
                {opt.replace("text-", "")}
              </option>
            ))}
          </select>
        </label>
        <button
          type="submit"
          className="flex min-h-11 cursor-pointer items-center gap-2 rounded-lg bg-primary px-4 font-bold text-primary-foreground"
        >
          <Plus className="h-4 w-4" />
          Add
        </button>
      </form>
    </section>
  )
}

function SkinManager({ player }: { player: Player }) {
  const hasCustom = (player.skinSource === "upload" || player.skinSource === "skin") && !!player.skinUrl
  return (
    <div className="mt-3 flex flex-col gap-2 border-t border-border pt-3">
      <div className="flex items-center gap-2">
        <span className="text-sm font-semibold text-foreground">Skin image</span>
        {hasCustom && (
          <span className="rounded border border-border bg-secondary px-2 py-0.5 text-xs font-semibold text-muted-foreground">
            {player.skinSource === "skin" ? "Minecraft skin" : "Photo"}
          </span>
        )}
      </div>
      <form action={uploadPlayerSkin} className="flex flex-wrap items-center gap-2">
        <input type="hidden" name="playerId" value={player.id} />
        <input
          type="file"
          name="skin"
          accept="image/png,image/*"
          required
          className="max-w-[200px] cursor-pointer text-xs text-muted-foreground file:mr-2 file:cursor-pointer file:rounded-md file:border-0 file:bg-secondary file:px-2 file:py-1 file:text-xs file:font-bold file:text-foreground"
        />
        <select
          name="kind"
          defaultValue={player.skinSource === "skin" ? "skin" : "upload"}
          aria-label={`${player.username} skin type`}
          className="min-h-9 cursor-pointer rounded-md border border-border bg-background px-2 text-sm text-foreground"
        >
          <option value="skin">Minecraft skin (.png)</option>
          <option value="upload">Photo</option>
        </select>
        <button
          type="submit"
          className="flex min-h-9 cursor-pointer items-center gap-1.5 rounded-md bg-primary px-3 text-sm font-bold text-primary-foreground"
        >
          <ImageUp className="h-4 w-4" />
          {hasCustom ? "Replace" : "Import"}
        </button>
      </form>
      {hasCustom && (
        <form action={removePlayerSkin}>
          <input type="hidden" name="playerId" value={player.id} />
          <button
            type="submit"
            className="flex min-h-9 w-fit cursor-pointer items-center rounded-md border border-border px-2 text-xs font-semibold text-muted-foreground hover:text-primary"
          >
            Remove image
          </button>
        </form>
      )}
    </div>
  )
}

export function AdminPanel({
  players,
  gamemodes,
  titles,
  tierlists,
}: {
  players: Player[]
  gamemodes: Gamemode[]
  titles: TitleRow[]
  tierlists: Tierlist[]
}) {
  return (
    <main className="mx-auto max-w-2xl px-4 py-6 lg:max-w-6xl lg:px-8 lg:py-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold font-display text-foreground">Smarmy&apos;s Admin</h1>
        <form action={logoutAction}>
          <button
            type="submit"
            className="flex min-h-11 cursor-pointer items-center gap-2 rounded-lg border border-border bg-card px-3 text-sm font-bold text-muted-foreground hover:text-foreground"
          >
            <LogOut className="h-4 w-4" />
            Log out
          </button>
        </form>
      </div>

      <TierlistManager tierlists={tierlists} />

      <GamemodeManager gamemodes={gamemodes} tierlists={tierlists} />

      <TitleManager titles={titles} />

      <form action={createPlayer} className="mb-6 rounded-xl border border-border bg-card p-4">
        <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-muted-foreground">Add player</h2>
        <div className="flex flex-wrap items-center gap-2">
          <input
            name="username"
            placeholder="Minecraft username"
            required
            className="min-h-11 flex-1 rounded-lg border border-border bg-background px-3 text-base text-foreground outline-none focus:border-primary"
          />
          <input
            name="region"
            placeholder="Region (e.g. NA)"
            className="min-h-11 w-28 rounded-lg border border-border bg-background px-3 text-base text-foreground outline-none focus:border-primary"
          />
          <button
            type="submit"
            className="flex min-h-11 cursor-pointer items-center gap-2 rounded-lg bg-primary px-4 font-bold text-primary-foreground"
          >
            <Plus className="h-4 w-4" />
            Add
          </button>
        </div>
      </form>

      <ul className="flex flex-col gap-3">
        {players.map((player) => (
          <li key={player.id} className="rounded-xl border border-border bg-card p-4">
            <div className="flex items-center gap-3">
              <PlayerSkin
                username={player.username}
                skinUrl={player.skinUrl}
                skinSource={player.skinSource}
                size={40}
                rounded="rounded-md"
                className="border border-border"
              />
              <div className="min-w-0 flex-1">
                <p className="truncate font-bold font-display text-foreground">{player.username}</p>
                <p className="text-xs text-muted-foreground">
                  {player.region ?? "—"} · {player.totalPoints} total pts
                </p>
              </div>
              <form action={deletePlayer}>
                <input type="hidden" name="id" value={player.id} />
                <button
                  type="submit"
                  aria-label={`Delete ${player.username}`}
                  className="flex min-h-9 cursor-pointer items-center rounded-md border border-border px-2 text-muted-foreground hover:text-primary"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </form>
            </div>

            <SkinManager player={player} />

            <TierEditor player={player} gamemodes={gamemodes} tierlists={tierlists} />
          </li>
        ))}
        {players.length === 0 && (
          <li className="rounded-xl border border-border bg-card p-6 text-center text-sm text-muted-foreground">
            No players yet. Add one above.
          </li>
        )}
      </ul>
    </main>
  )
}
