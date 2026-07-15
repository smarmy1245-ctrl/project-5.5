import { getTheme } from "@/lib/settings"
import { readableText } from "@/lib/colors"

// Injects the admin-configured theme as CSS custom properties on :root so the
// whole site (including the tier boards) picks up the color-wheel selections.
export async function ThemeStyle() {
  const theme = await getTheme()

  const tierVars = theme.tierColors
    .map((c, i) => `  --tier-${i + 1}: ${c};\n  --tier-${i + 1}-fg: ${readableText(c)};`)
    .join("\n")

  const css = `:root {
  --primary: ${theme.primary};
  --primary-foreground: ${readableText(theme.primary)};
  --ring: ${theme.primary};
  --sidebar-primary: ${theme.primary};
  --sidebar-primary-foreground: ${readableText(theme.primary)};
  --accent: ${theme.accent};
  --accent-foreground: ${readableText(theme.accent)};
${tierVars}
}`

  return <style dangerouslySetInnerHTML={{ __html: css }} />
}
