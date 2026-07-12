// Shared site appearance settings config.
// Safe to import from both client and server (no DB / server-only deps here).

export const DEFAULT_SITE_TITLE = "Smarmy's Tierlist"
export const DEFAULT_LOGO_URL = "/smarmy-logo.png"

// Each configurable color maps a database key to a CSS custom property.
// `default` is a hex approximation of the built-in theme, shown in the color
// picker before anything has been saved. Defaults are NOT injected into the
// page — only saved overrides are — so the original theme is untouched until
// the admin explicitly changes a color.
export type ColorField = {
  key: string // camelCase id used in the resolved colors map
  dbKey: string // key stored in the site_settings table
  cssVar: string // CSS custom property it overrides
  label: string
  hint: string
  default: string // hex fallback shown in the picker
}

export const COLOR_FIELDS: ColorField[] = [
  {
    key: "background",
    dbKey: "color_background",
    cssVar: "--background",
    label: "Background",
    hint: "Page background",
    default: "#1c0e11",
  },
  {
    key: "foreground",
    dbKey: "color_foreground",
    cssVar: "--foreground",
    label: "Text",
    hint: "Main text color",
    default: "#f6f1f1",
  },
  {
    key: "card",
    dbKey: "color_card",
    cssVar: "--card",
    label: "Cards & panels",
    hint: "Surface behind rows and boxes",
    default: "#29171b",
  },
  {
    key: "primary",
    dbKey: "color_primary",
    cssVar: "--primary",
    label: "Primary / brand",
    hint: "Buttons, highlights, accents",
    default: "#e11d2e",
  },
  {
    key: "primaryForeground",
    dbKey: "color_primary_foreground",
    cssVar: "--primary-foreground",
    label: "Primary text",
    hint: "Text on primary buttons",
    default: "#fef2f2",
  },
  {
    key: "secondary",
    dbKey: "color_secondary",
    cssVar: "--secondary",
    label: "Secondary",
    hint: "Chips and subtle fills",
    default: "#39211f",
  },
  {
    key: "mutedForeground",
    dbKey: "color_muted_foreground",
    cssVar: "--muted-foreground",
    label: "Muted text",
    hint: "Secondary / helper text",
    default: "#b49a98",
  },
  {
    key: "border",
    dbKey: "color_border",
    cssVar: "--border",
    label: "Borders",
    hint: "Outlines and dividers",
    default: "#4a2d2b",
  },
]

export const SITE_TITLE_KEY = "site_title"
export const LOGO_URL_KEY = "logo_url"

// Fully-resolved settings (defaults merged with saved overrides).
export type SiteSettings = {
  siteTitle: string
  logoUrl: string
  colors: Record<string, string>
  // Only the colors that have been explicitly saved — used to inject CSS vars.
  overrides: { cssVar: string; value: string }[]
}

const HEX_RE = /^#[0-9a-fA-F]{6}$/

export function isValidHex(value: string): boolean {
  return HEX_RE.test(value.trim())
}
