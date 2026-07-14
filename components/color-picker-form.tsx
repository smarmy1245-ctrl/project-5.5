"use client"

import { useRef, useState } from "react"
import { cn } from "@/lib/utils"

// A color "wheel" control backed by the native color picker.
// It lives inside its own <form> bound to a server action and saves when the
// admin clicks Apply (or tabs away from the picker).
export function ColorPickerForm({
  action,
  fields,
  value,
  label,
  allowClear = false,
  className,
}: {
  action: (formData: FormData) => void | Promise<void>
  // Hidden identifying fields (e.g. { id: "3" } or { tier: "1" }).
  fields: Record<string, string | number>
  value: string | null
  label?: string
  // When true, shows a "reset to theme default" button (clears the color).
  allowClear?: boolean
  className?: string
}) {
  const formRef = useRef<HTMLFormElement>(null)
  const [current, setCurrent] = useState(value ?? "#dc2626")

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <form ref={formRef} action={action} className="flex items-center gap-2">
        {Object.entries(fields).map(([k, v]) => (
          <input key={k} type="hidden" name={k} value={String(v)} />
        ))}

        <label className="group relative flex cursor-pointer items-center gap-2">
          <span
            className="h-8 w-8 shrink-0 rounded-full border-2 border-border shadow-sm transition-transform group-hover:scale-105"
            style={{ backgroundColor: value ?? "transparent" }}
            aria-hidden="true"
          />
          <input
            type="color"
            name="color"
            value={current}
            onChange={(e) => setCurrent(e.target.value)}
            onBlur={() => formRef.current?.requestSubmit()}
            className="absolute left-0 top-0 h-8 w-8 cursor-pointer opacity-0"
            aria-label={label ?? "Pick a color"}
          />
          {label && <span className="text-sm font-semibold text-foreground">{label}</span>}
        </label>

        <button
          type="submit"
          className="min-h-8 cursor-pointer rounded-md border border-border px-2 text-xs font-bold text-foreground hover:border-primary"
        >
          Apply
        </button>
      </form>

      {allowClear && value && (
        <form action={action}>
          {Object.entries(fields).map(([k, v]) => (
            <input key={k} type="hidden" name={k} value={String(v)} />
          ))}
          <input type="hidden" name="color" value="" />
          <button
            type="submit"
            className="min-h-8 cursor-pointer rounded-md px-2 text-xs font-semibold text-muted-foreground hover:text-primary"
          >
            Reset
          </button>
        </form>
      )}
    </div>
  )
}
