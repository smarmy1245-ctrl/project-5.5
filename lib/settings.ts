import "server-only"
import { query } from "./db"
import { ensureSchema } from "./schema"
import { DEFAULT_THEME, normalizeHex, type ThemeSettings } from "./colors"

const THEME_KEY = "theme"

// Reads the saved theme (primary/accent/tier colors), falling back to defaults
// for anything missing or invalid.
export async function getTheme(): Promise<ThemeSettings> {
  await ensureSchema()
  const rows = await query<{ value: string }>(`SELECT value FROM settings WHERE key = $1`, [THEME_KEY])
  if (!rows[0]) return DEFAULT_THEME
  try {
    const parsed = JSON.parse(rows[0].value) as Partial<ThemeSettings>
    const tierColors = Array.isArray(parsed.tierColors) ? parsed.tierColors : []
    return {
      primary: normalizeHex(parsed.primary) ?? DEFAULT_THEME.primary,
      accent: normalizeHex(parsed.accent) ?? DEFAULT_THEME.accent,
      tierColors: DEFAULT_THEME.tierColors.map((d, i) => normalizeHex(tierColors[i]) ?? d),
    }
  } catch {
    return DEFAULT_THEME
  }
}

export async function saveTheme(theme: ThemeSettings): Promise<void> {
  await ensureSchema()
  const clean: ThemeSettings = {
    primary: normalizeHex(theme.primary) ?? DEFAULT_THEME.primary,
    accent: normalizeHex(theme.accent) ?? DEFAULT_THEME.accent,
    tierColors: DEFAULT_THEME.tierColors.map((d, i) => normalizeHex(theme.tierColors[i]) ?? d),
  }
  await query(
    `INSERT INTO settings (key, value) VALUES ($1, $2)
     ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value`,
    [THEME_KEY, JSON.stringify(clean)],
  )
}
