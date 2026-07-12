"use client"

import { useEffect, useRef, useState } from "react"
import { ImageUp, RotateCcw, Save } from "lucide-react"
import { COLOR_FIELDS, type SiteSettings } from "@/lib/site-settings"
import { resetSiteSettings, updateSiteSettings, uploadLogo } from "@/app/actions/admin"

export function AppearanceSettings({ settings }: { settings: SiteSettings }) {
  const [colors, setColors] = useState<Record<string, string>>(settings.colors)
  const [title, setTitle] = useState(settings.siteTitle)
  const formRef = useRef<HTMLFormElement>(null)

  // Keep local state in sync when the server sends updated settings (after save).
  useEffect(() => {
    setColors(settings.colors)
    setTitle(settings.siteTitle)
  }, [settings])

  // Live preview: push a color straight onto the document root so the change is
  // visible everywhere immediately, before saving.
  function previewColor(cssVar: string, value: string) {
    document.documentElement.style.setProperty(cssVar, value)
  }

  function handleColorChange(key: string, cssVar: string, value: string) {
    setColors((prev) => ({ ...prev, [key]: value }))
    previewColor(cssVar, value)
  }

  // Reset clears both the live preview overrides and the saved values.
  function clearPreview() {
    for (const field of COLOR_FIELDS) {
      document.documentElement.style.removeProperty(field.cssVar)
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <p className="text-xs text-muted-foreground">
        Change the logo, site name, and every theme color. Color changes preview live as you pick
        them — click <span className="font-bold text-foreground">Save appearance</span> to apply
        them for everyone.
      </p>

      {/* Logo + title */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-2 rounded-lg border border-border bg-background p-3">
          <span className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Logo</span>
          <div className="flex items-center gap-3">
            <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-md border border-border bg-card">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={settings.logoUrl || "/smarmy-logo.png"}
                alt="Current logo"
                className="h-full w-full object-contain"
              />
            </div>
            <form action={uploadLogo} className="flex flex-col gap-2">
              <input
                type="file"
                name="logo"
                accept="image/*"
                required
                aria-label="Upload new logo"
                className="max-w-[200px] cursor-pointer text-xs text-muted-foreground file:mr-2 file:cursor-pointer file:rounded-md file:border-0 file:bg-secondary file:px-2 file:py-1 file:text-xs file:font-bold file:text-foreground"
              />
              <button
                type="submit"
                className="flex min-h-9 w-fit cursor-pointer items-center gap-1.5 rounded-md bg-primary px-3 text-sm font-bold text-primary-foreground"
              >
                <ImageUp className="h-4 w-4" />
                Upload logo
              </button>
            </form>
          </div>
        </div>

        <label className="flex flex-col gap-2 rounded-lg border border-border bg-background p-3">
          <span className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
            Site name
          </span>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            form="appearance-form"
            name="site_title"
            placeholder="Smarmy's Tierlist"
            className="min-h-11 rounded-lg border border-border bg-card px-3 text-base text-foreground outline-none focus:border-primary"
          />
          <span className="text-xs text-muted-foreground">
            Used for the browser tab title and logo alt text.
          </span>
        </label>
      </div>

      {/* Colors */}
      <form ref={formRef} id="appearance-form" action={updateSiteSettings} className="flex flex-col gap-4">
        <div className="grid gap-3 sm:grid-cols-2">
          {COLOR_FIELDS.map((field) => (
            <div
              key={field.key}
              className="flex items-center gap-3 rounded-lg border border-border bg-background p-3"
            >
              <label
                htmlFor={`color-${field.key}`}
                className="relative h-10 w-10 shrink-0 cursor-pointer overflow-hidden rounded-md border border-border"
                style={{ backgroundColor: colors[field.key] }}
              >
                <input
                  id={`color-${field.key}`}
                  type="color"
                  name={field.dbKey}
                  value={colors[field.key]}
                  onChange={(e) => handleColorChange(field.key, field.cssVar, e.target.value)}
                  className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                  aria-label={field.label}
                />
              </label>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-bold text-foreground">{field.label}</p>
                <p className="truncate text-xs text-muted-foreground">{field.hint}</p>
              </div>
              <input
                value={colors[field.key]}
                onChange={(e) => {
                  const v = e.target.value
                  setColors((prev) => ({ ...prev, [field.key]: v }))
                  if (/^#[0-9a-fA-F]{6}$/.test(v)) previewColor(field.cssVar, v)
                }}
                aria-label={`${field.label} hex value`}
                className="w-20 rounded-md border border-border bg-card px-2 py-1 font-mono text-xs uppercase text-foreground outline-none focus:border-primary"
              />
            </div>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-2 border-t border-border pt-4">
          <button
            type="submit"
            className="flex min-h-11 cursor-pointer items-center gap-2 rounded-lg bg-primary px-4 font-bold text-primary-foreground"
          >
            <Save className="h-4 w-4" />
            Save appearance
          </button>
          <button
            type="submit"
            formAction={async () => {
              clearPreview()
              await resetSiteSettings()
            }}
            className="flex min-h-11 cursor-pointer items-center gap-2 rounded-lg border border-border bg-card px-4 text-sm font-bold text-muted-foreground hover:text-foreground"
          >
            <RotateCcw className="h-4 w-4" />
            Reset to default
          </button>
        </div>
      </form>
    </div>
  )
}
