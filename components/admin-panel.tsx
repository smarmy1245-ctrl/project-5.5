import { ArrowLeft, Hash, ImageUp, Layers, LogOut, Palette, Plus, Trash2, Trophy } from "lucide-react"
import Link from "next/link"
import type { Player, TitleRow } from "@/lib/data"
import {
  GAMEMODE_ICON_OPTIONS,
  gamemodeIcon,
  readableOn,
  tierLabel,
  type Gamemode,
  type ThemeColors,
  type Tierlist,
} from "@/lib/tiers"
import { PlayerSkin } from "./player-skin"
import { AdminNav, type AdminSection } from "./admin-nav"
import { AdminImport } from "./admin-import"
import { ColorPickerForm } from "./color-picker-form"
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
  renameTierlist,
  setPoints,
  setTier,
  setTierlistMode,
  updateAccentColors,
  updateGamemodeColor,
  updateGamemodeIcon,
  updateTierColor,
  updateTitle,
  updateTitleColor,
  uploadPlayerSkin,
} from "@/app/actions/admin"

const SECTIONS: AdminSection[] = [
  { id: "section-tierlists", label: "Tier lists" },
  { id: "section-gamemodes", label: "Gamemodes" },
  { id: "section-colors", label: "Colors & theme" },
  { id: "section-titles", label: "Titles" },
  { id: "section-add-player", label: "Add player" },
  { id: "section-import", label: "Import from Neon" },
  { id: "section-players", label: "Players & tiers" },
]

function SectionCard({
  id,
  title,
  description,
  icon: Icon,
  children,
}: {
  id: string
  title: string
  description?: string
  icon: React.ElementType
  children: React.ReactNode
}) {
  return (
    <section id={id} className="scroll-mt-24 rounded-2xl border border-border bg-card p-5">
      <div className="mb-4 flex items-center gap-2.5">
        <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/15 text-primary">
          <Icon className="h-5 w-5" aria-hidden="true" />
        </span>
        <div>
          <h2 className="text-base font-bold font-display text-foreground">{title}</h2>
          {description && <p className="text-xs text-muted-foreground">{description}</p>}
        </div>
      </div>
      {children}
    </section>
  )
}

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
    <div className="mt-3 flex flex-col gap-4 border-t border-border pt-3">
      {tierlists.map((tl) => {
        const listGamemodes = gamemodes.filter((gm) => gm.tierlistId === tl.id)
        if (listGamemodes.length === 0) return null
        return (
          <div key={tl.id} className="flex flex-col gap-2">
            <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-primary">
              {tl.mode === "points" ? (
                <Hash className="h-3.5 w-3.5" aria-hidden="true" />
              ) : (
                <Layers className="h-3.5 w-3.5" aria-hidden="true" />
              )}
              {tl.label}
              <span className="rounded bg-secondary px-1.5 py-0.5 text-[10px] font-semibold text-muted-foreground">
                {tl.mode === "points" ? "Points" : "Tiers"}
              </span>
            </p>

            {listGamemodes.map((gm) => {
              const current = player.tiers.find((t) => t.gamemode === gm.slug)
              return (
                <div key={gm.id} className="flex flex-wrap items-center gap-2">
                  <span className="w-24 text-sm font-semibold text-foreground">{gm.label}</span>

                  {tl.mode === "points" ? (
                    <form action={setPoints} className="flex flex-wrap items-center gap-2">
                      <input type="hidden" name="playerId" value={player.id} />
                      <input type="hidden" name="gamemode" value={gm.slug} />
                      <input
                        name="points"
                        type="number"
                        defaultValue={current?.points ?? 0}
                        className="min-h-9 w-24 rounded-md border border-border bg-background px-2 text-sm text-foreground outline-none focus:border-primary"
                        aria-label={`${gm.label} points`}
                      />
                      <button
                        type="submit"
                        className="min-h-9 cursor-pointer rounded-md bg-primary px-3 text-sm font-bold text-primary-foreground"
                      >
                        {current ? "Update" : "Set"}
                      </button>
                      {current && (
                        <span className="rounded border border-border bg-secondary px-2 py-1 font-mono text-xs text-foreground">
                          {current.points} pts
                        </span>
                      )}
                    </form>
                  ) : (
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
                        defaultValue={current?.tier && current.tier > 0 ? current.tier : 3}
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
                      {current && (
                        <span className="rounded border border-border bg-secondary px-2 py-1 font-mono text-xs text-foreground">
                          {tierLabel(current.tier, current.tierType)} · {current.points} pts
                        </span>
                      )}
                    </form>
                  )}

                  {current && (
                    <form action={removeTier}>
                      <input type="hidden" name="playerId" value={player.id} />
                      <input type="hidden" name="gamemode" value={gm.slug} />
                      <button
                        type="submit"
                        aria-label={`Remove ${gm.label}`}
                        className="flex min-h-9 cursor-pointer items-center rounded-md border border-border px-2 text-muted-foreground hover:text-primary"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </form>
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
    <SectionCard
      id="section-tierlists"
      title="Tier lists"
      description="Each list is its own board with independent points. Choose Tiers (HT/LT) or Points mode."
      icon={Layers}
    >
      <ul className="mb-3 flex flex-col gap-2">
        {tierlists.map((tl) => (
          <li key={tl.id} className="flex flex-col gap-2 rounded-lg border border-border bg-background px-3 py-2.5">
            <div className="flex flex-wrap items-center gap-2">
              <Layers className="h-5 w-5 text-primary" aria-hidden="true" />
              <form action={renameTierlist} className="flex flex-1 items-center gap-2">
                <input type="hidden" name="id" value={tl.id} />
                <input
                  name="label"
                  defaultValue={tl.label}
                  className="min-h-9 flex-1 rounded-md border border-border bg-card px-2 text-base font-bold font-display text-foreground outline-none focus:border-primary"
                  aria-label={`${tl.label} name`}
                />
                <button
                  type="submit"
                  className="min-h-9 cursor-pointer rounded-md border border-border px-3 text-sm font-bold text-foreground hover:border-primary"
                >
                  Rename
                </button>
              </form>
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
            </div>
            <form action={setTierlistMode} className="flex items-center gap-2">
              <input type="hidden" name="id" value={tl.id} />
              <span className="text-xs font-semibold text-muted-foreground">Ranking mode</span>
              <select
                name="mode"
                defaultValue={tl.mode}
                className="min-h-9 cursor-pointer rounded-md border border-border bg-card px-2 text-sm text-foreground"
                aria-label={`${tl.label} mode`}
              >
                <option value="tier">Tiers (HT / LT)</option>
                <option value="points">Points (raw numbers)</option>
              </select>
              <button
                type="submit"
                className="min-h-9 cursor-pointer rounded-md border border-border px-3 text-sm font-bold text-foreground hover:border-primary"
              >
                Save mode
              </button>
            </form>
          </li>
        ))}
        {tierlists.length === 0 && <li className="text-sm text-muted-foreground">No tier lists yet.</li>}
      </ul>

      <form action={createTierlist} className="flex flex-wrap items-center gap-2 border-t border-border pt-3">
        <input
          name="label"
          placeholder="New tier list name (e.g. Subtiers)"
          required
          className="min-h-11 flex-1 rounded-lg border border-border bg-background px-3 text-base text-foreground outline-none focus:border-primary"
        />
        <select
          name="mode"
          defaultValue="tier"
          className="min-h-11 cursor-pointer rounded-lg border border-border bg-background px-3 text-base text-foreground"
          aria-label="New tier list mode"
        >
          <option value="tier">Tiers (HT / LT)</option>
          <option value="points">Points</option>
        </select>
        <button
          type="submit"
          className="flex min-h-11 cursor-pointer items-center gap-2 rounded-lg bg-primary px-4 font-bold text-primary-foreground"
        >
          <Plus className="h-4 w-4" />
          Add
        </button>
      </form>
    </SectionCard>
  )
}

function GamemodeManager({ gamemodes, tierlists }: { gamemodes: Gamemode[]; tierlists: Tierlist[] }) {
  return (
    <SectionCard
      id="section-gamemodes"
      title="Gamemodes"
      description="Pick an icon and a custom color for each gamemode."
      icon={Trophy}
    >
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
                      <Icon className="h-5 w-5" style={{ color: gm.color ?? undefined }} aria-hidden="true" />
                      <span className="flex-1 text-sm font-semibold text-foreground">{gm.label}</span>

                      <form action={updateGamemodeIcon} className="flex items-center gap-2">
                        <input type="hidden" name="id" value={gm.id} />
                        <select
                          name="icon"
                          defaultValue={gm.icon}
                          className="min-h-9 cursor-pointer rounded-md border border-border bg-card px-2 text-sm text-foreground"
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
                          Icon
                        </button>
                      </form>

                      <ColorPickerForm
                        action={updateGamemodeColor}
                        fields={{ id: gm.id }}
                        value={gm.color}
                        allowClear
                      />

                      {tierlists.length > 1 && (
                        <form action={moveGamemode} className="flex items-center gap-2">
                          <input type="hidden" name="id" value={gm.id} />
                          <select
                            name="tierlistId"
                            defaultValue={gm.tierlistId}
                            className="min-h-9 cursor-pointer rounded-md border border-border bg-card px-2 text-sm text-foreground"
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
        <label className="flex items-center gap-1.5 text-sm text-muted-foreground">
          Color
          <input
            type="color"
            name="color"
            defaultValue="#dc2626"
            className="h-9 w-10 cursor-pointer rounded border border-border bg-background"
            aria-label="New gamemode color"
          />
        </label>
        <button
          type="submit"
          className="flex min-h-11 cursor-pointer items-center gap-2 rounded-lg bg-primary px-4 font-bold text-primary-foreground"
        >
          <Plus className="h-4 w-4" />
          Add
        </button>
      </form>
    </SectionCard>
  )
}

function ThemeManager({ themeColors }: { themeColors: ThemeColors }) {
  const tiers = [1, 2, 3, 4, 5]
  return (
    <SectionCard
      id="section-colors"
      title="Colors & theme"
      description="Use the color wheel to recolor tiers and the HT/LT accents shown across the site."
      icon={Palette}
    >
      <p className="mb-2 text-xs font-bold uppercase tracking-wide text-muted-foreground">Tier colors</p>
      <ul className="mb-4 flex flex-col gap-2">
        {tiers.map((tier) => {
          const color = themeColors.tierColors[tier]
          return (
            <li
              key={tier}
              className="flex flex-wrap items-center gap-3 rounded-lg border border-border bg-background px-3 py-2"
            >
              <span
                className="flex h-8 min-w-16 items-center justify-center rounded-md px-2 text-sm font-bold font-display"
                style={{ backgroundColor: color, color: readableOn(color) }}
              >
                Tier {tier}
              </span>
              <ColorPickerForm action={updateTierColor} fields={{ tier }} value={color} />
            </li>
          )
        })}
      </ul>

      <p className="mb-2 text-xs font-bold uppercase tracking-wide text-muted-foreground">HT / LT accent colors</p>
      <form
        action={updateAccentColors}
        className="flex flex-wrap items-center gap-4 rounded-lg border border-border bg-background px-3 py-3"
      >
        <label className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <span style={{ color: themeColors.htColor }}>HT</span>
          <input
            type="color"
            name="htColor"
            defaultValue={themeColors.htColor}
            className="h-9 w-10 cursor-pointer rounded border border-border bg-background"
            aria-label="High tier color"
          />
        </label>
        <label className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <span style={{ color: themeColors.ltColor }}>LT</span>
          <input
            type="color"
            name="ltColor"
            defaultValue={themeColors.ltColor}
            className="h-9 w-10 cursor-pointer rounded border border-border bg-background"
            aria-label="Low tier color"
          />
        </label>
        <button
          type="submit"
          className="min-h-9 cursor-pointer rounded-md bg-primary px-3 text-sm font-bold text-primary-foreground"
        >
          Save accents
        </button>
      </form>
    </SectionCard>
  )
}

function TitleManager({ titles }: { titles: TitleRow[] }) {
  return (
    <SectionCard
      id="section-titles"
      title="Titles"
      description="Rename ranks, set point thresholds, and give each a custom color with the wheel."
      icon={Trophy}
    >
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
                  className="min-h-10 w-full rounded-md border border-border bg-card px-2 text-base font-bold outline-none focus:border-primary"
                  style={{ color: t.color ?? undefined }}
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
              <button
                type="submit"
                className="min-h-10 cursor-pointer rounded-md bg-primary px-3 text-sm font-bold text-primary-foreground"
              >
                Save
              </button>
            </form>
            <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
              <ColorPickerForm action={updateTitleColor} fields={{ id: t.id }} value={t.color} allowClear label="Color" />
              <form action={deleteTitle}>
                <input type="hidden" name="id" value={t.id} />
                <button
                  type="submit"
                  className="cursor-pointer text-xs font-semibold text-muted-foreground hover:text-primary"
                >
                  Delete title
                </button>
              </form>
            </div>
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
        <label className="flex flex-col gap-1">
          <span className="text-xs font-semibold text-muted-foreground">Color</span>
          <input
            type="color"
            name="color"
            defaultValue="#fca5a5"
            className="h-11 w-12 cursor-pointer rounded-lg border border-border bg-background"
            aria-label="New title color"
          />
        </label>
        <button
          type="submit"
          className="flex min-h-11 cursor-pointer items-center gap-2 rounded-lg bg-primary px-4 font-bold text-primary-foreground"
        >
          <Plus className="h-4 w-4" />
          Add
        </button>
      </form>
    </SectionCard>
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
  themeColors,
}: {
  players: Player[]
  gamemodes: Gamemode[]
  titles: TitleRow[]
  tierlists: Tierlist[]
  themeColors: ThemeColors
}) {
  return (
    <main className="mx-auto max-w-2xl px-4 py-6 lg:max-w-6xl lg:px-8 lg:py-8">
      {/* Sticky toolbar with jump-to-control dropdown + navigation */}
      <div className="sticky top-0 z-20 -mx-4 mb-6 border-b border-border bg-background/90 px-4 py-3 backdrop-blur lg:-mx-8 lg:px-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-2xl font-bold font-display text-foreground">Smarmy&apos;s Admin</h1>
          <div className="flex flex-wrap items-center gap-2">
            <AdminNav sections={SECTIONS} />
            <Link
              href="/"
              className="flex min-h-11 cursor-pointer items-center gap-2 rounded-lg border border-border bg-card px-3 text-sm font-bold text-foreground transition-colors hover:border-primary"
            >
              <ArrowLeft className="h-4 w-4" aria-hidden="true" />
              <span className="hidden sm:inline">Tier list</span>
            </Link>
            <form action={logoutAction}>
              <button
                type="submit"
                className="flex min-h-11 cursor-pointer items-center gap-2 rounded-lg border border-border bg-card px-3 text-sm font-bold text-muted-foreground hover:text-foreground"
              >
                <LogOut className="h-4 w-4" />
                <span className="hidden sm:inline">Log out</span>
              </button>
            </form>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-6">
        <TierlistManager tierlists={tierlists} />

        <GamemodeManager gamemodes={gamemodes} tierlists={tierlists} />

        <ThemeManager themeColors={themeColors} />

        <TitleManager titles={titles} />

        <SectionCard id="section-add-player" title="Add player" icon={Plus}>
          <form action={createPlayer} className="flex flex-wrap items-center gap-2">
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
          </form>
        </SectionCard>

        <SectionCard
          id="section-import"
          title="Import from Neon"
          description="Bulk-load players by pasting JSON straight from your Neon database."
          icon={Hash}
        >
          <AdminImport />
        </SectionCard>

        <section id="section-players" className="scroll-mt-24">
          <h2 className="mb-3 flex items-center gap-2 text-base font-bold font-display text-foreground">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/15 text-primary">
              <ImageUp className="h-5 w-5" aria-hidden="true" />
            </span>
            Players &amp; tiers
          </h2>
          <ul className="flex flex-col gap-3">
            {players.map((player) => (
              <li key={player.id} className="rounded-2xl border border-border bg-card p-4">
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
              <li className="rounded-2xl border border-border bg-card p-6 text-center text-sm text-muted-foreground">
                No players yet. Add one above.
              </li>
            )}
          </ul>
        </section>
      </div>
    </main>
  )
}
