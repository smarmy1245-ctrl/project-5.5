"use client"

import { useActionState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { ArrowLeft, Lock } from "lucide-react"
import { loginAction } from "@/app/actions/admin"

export function AdminLogin() {
  const [state, formAction, pending] = useActionState(loginAction, { error: null as string | null })
  const router = useRouter()

  return (
    <div className="flex min-h-dvh items-center justify-center px-4">
      <form
        action={formAction}
        className="w-full max-w-sm rounded-2xl border border-border bg-card p-6"
      >
        <button
          type="button"
          onClick={() => router.back()}
          className="mb-4 flex min-h-11 w-fit cursor-pointer items-center gap-1.5 rounded-lg border border-border bg-background px-3 text-sm font-bold text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Back
        </button>

        <div className="mb-4 flex items-center gap-2">
          <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/15 text-primary">
            <Lock className="h-5 w-5" />
          </span>
          <div>
            <h1 className="text-lg font-bold font-display text-foreground">Admin Access</h1>
            <p className="text-xs text-muted-foreground">Enter the access code to continue.</p>
          </div>
        </div>

        <input
          type="password"
          name="code"
          autoComplete="off"
          placeholder="Access code"
          className="min-h-11 w-full rounded-lg border border-border bg-background px-3 text-base text-foreground outline-none focus:border-primary"
          required
        />

        {state?.error && <p className="mt-2 text-sm text-primary">{state.error}</p>}

        <button
          type="submit"
          disabled={pending}
          className="mt-4 min-h-11 w-full rounded-lg bg-primary px-4 font-bold text-primary-foreground transition-opacity disabled:opacity-60"
        >
          {pending ? "Checking..." : "Unlock"}
        </button>

        <Link
          href="/"
          className="mt-2 flex min-h-11 w-full items-center justify-center rounded-lg border border-border bg-background px-4 font-bold text-muted-foreground transition-colors hover:text-foreground"
        >
          Cancel
        </Link>
      </form>
    </div>
  )
}
