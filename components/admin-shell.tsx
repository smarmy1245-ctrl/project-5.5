"use client"

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react"
import { ChevronDown, Columns3, Eye, EyeOff, Search, X } from "lucide-react"
import { cn } from "@/lib/utils"

type SectionMeta = { id: string; title: string }

type ShellContextValue = {
  query: string
  hidden: Record<string, boolean>
  collapsed: Record<string, boolean>
  registerSection: (meta: SectionMeta) => void
  unregisterSection: (id: string) => void
  toggleCollapsed: (id: string) => void
  matches: (title: string, keywords: string[]) => boolean
}

const ShellContext = createContext<ShellContextValue | null>(null)

function useShell() {
  const ctx = useContext(ShellContext)
  if (!ctx) throw new Error("Admin section must be used inside AdminShell")
  return ctx
}

export function AdminShell({ children }: { children: ReactNode }) {
  const [query, setQuery] = useState("")
  const [hidden, setHidden] = useState<Record<string, boolean>>({})
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({})
  const [sections, setSections] = useState<SectionMeta[]>([])
  const [menuOpen, setMenuOpen] = useState(false)

  const registerSection = (meta: SectionMeta) =>
    setSections((prev) => (prev.some((s) => s.id === meta.id) ? prev : [...prev, meta]))
  const unregisterSection = (id: string) => setSections((prev) => prev.filter((s) => s.id !== id))

  const toggleCollapsed = (id: string) =>
    setCollapsed((prev) => ({ ...prev, [id]: !prev[id] }))
  const toggleHidden = (id: string) => setHidden((prev) => ({ ...prev, [id]: !prev[id] }))

  const matches = (title: string, keywords: string[]) => {
    const q = query.trim().toLowerCase()
    if (!q) return true
    return (
      title.toLowerCase().includes(q) ||
      keywords.some((k) => k.toLowerCase().includes(q))
    )
  }

  const value = useMemo<ShellContextValue>(
    () => ({ query, hidden, collapsed, registerSection, unregisterSection, toggleCollapsed, matches }),
    [query, hidden, collapsed],
  )

  const hiddenCount = Object.values(hidden).filter(Boolean).length

  return (
    <ShellContext.Provider value={value}>
      <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search settings (colors, logo, players, titles...)"
            aria-label="Search settings"
            className="min-h-11 w-full rounded-lg border border-border bg-card pl-9 pr-9 text-base text-foreground outline-none focus:border-primary"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery("")}
              aria-label="Clear search"
              className="absolute right-2 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        <div className="relative">
          <button
            type="button"
            onClick={() => setMenuOpen((o) => !o)}
            aria-expanded={menuOpen}
            className="flex min-h-11 w-full cursor-pointer items-center justify-center gap-2 rounded-lg border border-border bg-card px-4 text-sm font-bold text-foreground hover:border-primary sm:w-auto"
          >
            <Columns3 className="h-4 w-4" aria-hidden="true" />
            Sections
            {hiddenCount > 0 && (
              <span className="rounded bg-primary px-1.5 py-0.5 text-xs font-bold text-primary-foreground">
                {hiddenCount} hidden
              </span>
            )}
            <ChevronDown
              className={cn("h-4 w-4 transition-transform", menuOpen && "rotate-180")}
              aria-hidden="true"
            />
          </button>

          {menuOpen && (
            <>
              <div className="fixed inset-0 z-30" onClick={() => setMenuOpen(false)} aria-hidden="true" />
              <div className="absolute right-0 z-40 mt-2 w-60 rounded-xl border border-border bg-popover p-1.5 shadow-xl">
                <p className="px-2 py-1.5 text-xs font-bold uppercase tracking-wide text-muted-foreground">
                  Show / hide sections
                </p>
                {sections.map((s) => {
                  const isHidden = !!hidden[s.id]
                  return (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => toggleHidden(s.id)}
                      className="flex w-full cursor-pointer items-center gap-2 rounded-lg px-2 py-2 text-left text-sm font-semibold text-foreground hover:bg-card"
                    >
                      {isHidden ? (
                        <EyeOff className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                      ) : (
                        <Eye className="h-4 w-4 text-primary" aria-hidden="true" />
                      )}
                      <span className={cn("flex-1", isHidden && "text-muted-foreground line-through")}>
                        {s.title}
                      </span>
                    </button>
                  )
                })}
                {sections.length === 0 && (
                  <p className="px-2 py-2 text-sm text-muted-foreground">No sections.</p>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {children}

      {query && <NoResults query={query} />}
    </ShellContext.Provider>
  )
}

// Rendered inside AdminShell; shows a hint when a search hides every section.
function NoResults({ query }: { query: string }) {
  const [empty, setEmpty] = useState(false)
  // A simple DOM check after render: if no visible section exists, show hint.
  useEffect(() => {
    const anyVisible = document.querySelector("[data-admin-section='visible']")
    setEmpty(!anyVisible)
  })
  if (!empty) return null
  return (
    <div className="rounded-xl border border-border bg-card p-6 text-center text-sm text-muted-foreground">
      No settings match &ldquo;{query}&rdquo;.
    </div>
  )
}

export function AdminSection({
  id,
  title,
  keywords = [],
  icon,
  children,
}: {
  id: string
  title: string
  keywords?: string[]
  icon?: ReactNode
  children: ReactNode
}) {
  const { query, hidden, collapsed, registerSection, unregisterSection, toggleCollapsed, matches } =
    useShell()

  useEffect(() => {
    registerSection({ id, title })
    return () => unregisterSection(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, title])

  const searching = query.trim().length > 0
  const isMatch = matches(title, keywords)
  // While searching, matching sections always show (even if manually hidden)
  // so you can quickly find a setting to fix. Otherwise respect the hide toggle.
  const visible = searching ? isMatch : !hidden[id]
  const isCollapsed = !!collapsed[id] && !searching

  if (!visible) return <div data-admin-section="hidden" hidden />

  return (
    <section
      data-admin-section="visible"
      className="mb-4 overflow-hidden rounded-xl border border-border bg-card"
    >
      <button
        type="button"
        onClick={() => toggleCollapsed(id)}
        aria-expanded={!isCollapsed}
        className="flex w-full cursor-pointer items-center gap-2 px-4 py-3 text-left"
      >
        {icon}
        <span className="flex-1 text-sm font-bold uppercase tracking-wide text-muted-foreground">
          {title}
        </span>
        <ChevronDown
          className={cn(
            "h-4 w-4 shrink-0 text-muted-foreground transition-transform",
            isCollapsed && "-rotate-90",
          )}
          aria-hidden="true"
        />
      </button>
      {!isCollapsed && <div className="border-t border-border p-4">{children}</div>}
    </section>
  )
}
