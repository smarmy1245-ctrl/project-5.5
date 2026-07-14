"use client"

import { useActionState } from "react"
import { Database, Upload } from "lucide-react"
import { importData } from "@/app/actions/admin"
import { cn } from "@/lib/utils"

const EXAMPLE = `[
  {
    "username": "ItzRealMe",
    "region": "NA",
    "tiers": [
      { "gamemode": "sword", "tier": 1, "tierType": "HT" },
      { "gamemode": "uhc", "tier": 2, "tierType": "LT" }
    ]
  },
  {
    "username": "coldified",
    "region": "EU",
    "points": [
      { "gamemode": "sword", "points": 120 }
    ]
  }
]`

export function AdminImport() {
  const [state, formAction, pending] = useActionState(importData, null as { ok: boolean; message: string } | null)

  return (
    <form action={formAction} className="flex flex-col gap-3">
      <p className="text-xs text-muted-foreground">
        Paste a JSON array of players exported from the Neon console (or written by hand). Existing players are
        updated by username; unknown gamemodes are skipped. Use <code className="text-foreground">tiers</code> for
        HT/LT lists and <code className="text-foreground">points</code> for points-mode lists.
      </p>

      <textarea
        name="json"
        rows={10}
        spellCheck={false}
        placeholder={EXAMPLE}
        className="w-full rounded-lg border border-border bg-background p-3 font-mono text-xs text-foreground outline-none placeholder:text-muted-foreground/60 focus:border-primary"
      />

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={pending}
          className="flex min-h-11 cursor-pointer items-center gap-2 rounded-lg bg-primary px-4 font-bold text-primary-foreground transition-opacity disabled:opacity-60"
        >
          <Upload className="h-4 w-4" aria-hidden="true" />
          {pending ? "Importing..." : "Import players"}
        </button>
        {state && (
          <span
            className={cn(
              "text-sm font-semibold",
              state.ok ? "text-emerald-400" : "text-primary",
            )}
          >
            {state.message}
          </span>
        )}
      </div>

      <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Database className="h-3.5 w-3.5" aria-hidden="true" />
        Tip: in the Neon SQL editor run <code className="text-foreground">SELECT json_agg(...)</code> and paste the
        result here.
      </p>
    </form>
  )
}
