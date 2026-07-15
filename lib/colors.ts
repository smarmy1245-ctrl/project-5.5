// Shared color helpers used by both client and server code.
// Everything here is framework-agnostic (no "server-only") so the admin panel
// (client) and the theme injector (server) can both import it.

export type ThemeSettings = {
  primary: string
  accent: string
  tierColors: string[] // exactly 5 entries: tier 1 (highest) -> tier 5 (lowest)
}

// Hex defaults that mirror the original red theme.
export const DEFAULT_THEME: ThemeSettings = {
  primary: "#e11d2e",
  accent: "#b91c3c",
  tierColors: ["#450a0a", "#7f1d1d", "#991b1b", "#b91c1c", "#dc2626"],
}

export const DEFAULT_TITLE_COLOR = "#fca5a5"

// Fallback mapping so titles that were saved with the old Tailwind class names
// still render a sensible color once we switch to hex.
export const TITLE_CLASS_TO_HEX: Record<string, string> = {
  "text-amber-400": "#fbbf24",
  "text-orange-400": "#fb923c",
  "text-rose-400": "#fb7185",
  "text-red-400": "#f87171",
  "text-red-300": "#fca5a5",
  "text-emerald-400": "#34d399",
  "text-sky-400": "#38bdf8",
  "text-muted-foreground": "#a1a1aa",
}

// Normalizes user input into a #rrggbb string, or null if invalid.
export function normalizeHex(input: string | null | undefined): string | null {
  if (!input) return null
  let s = input.trim()
  if (!s.startsWith("#")) s = `#${s}`
  if (/^#[0-9a-fA-F]{3}$/.test(s)) {
    s = `#${s
      .slice(1)
      .split("")
      .map((c) => c + c)
      .join("")}`
  }
  if (/^#[0-9a-fA-F]{6}$/.test(s)) return s.toLowerCase()
  return null
}

// Picks black or white for readable text on top of the given background color.
export function readableText(hex: string): string {
  const c = normalizeHex(hex)
  if (!c) return "#ffffff"
  const r = parseInt(c.slice(1, 3), 16) / 255
  const g = parseInt(c.slice(3, 5), 16) / 255
  const b = parseInt(c.slice(5, 7), 16) / 255
  const lin = (v: number) => (v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4))
  const L = 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b)
  return L > 0.45 ? "#111111" : "#ffffff"
}

// Resolves a stored title color (hex OR legacy class name) to a usable hex.
export function resolveTitleColor(color: string | null | undefined, legacyClass?: string | null): string {
  const direct = normalizeHex(color ?? undefined)
  if (direct) return direct
  if (legacyClass && TITLE_CLASS_TO_HEX[legacyClass]) return TITLE_CLASS_TO_HEX[legacyClass]
  return DEFAULT_TITLE_COLOR
}
