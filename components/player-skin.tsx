"use client"

import { skinBody, skinHead } from "@/lib/tiers"
import { cn } from "@/lib/utils"

type Props = {
  username: string
  skinUrl?: string | null
  skinSource?: string | null
  variant?: "head" | "body"
  size: number
  className?: string
  rounded?: string
}

// Renders a player's skin.
// - Photo uploads (skinSource === "upload") are shown directly as the avatar.
// - Imported Minecraft skin PNG textures (skinSource === "skin") and any other raw
//   texture URL are pixel-cropped to the 8x8 face at (8,8) in the 64x64 texture.
// - Otherwise we fall back to username-based mc-heads renders.
export function PlayerSkin({ username, skinUrl, skinSource, variant = "head", size, className, rounded }: Props) {
  if (skinUrl && skinSource === "upload") {
    return (
      <img
        src={skinUrl || "/placeholder.svg"}
        alt={`${username} skin`}
        width={size}
        height={size}
        className={cn("shrink-0 object-cover object-center", rounded, className)}
        style={{ width: size, height: size }}
      />
    )
  }

  if (skinUrl) {
    const scale = size / 8
    return (
      <span
        role="img"
        aria-label={`${username} skin`}
        className={cn("block shrink-0 bg-secondary", rounded, className)}
        style={{
          width: size,
          height: size,
          backgroundImage: `url(${skinUrl})`,
          backgroundRepeat: "no-repeat",
          backgroundSize: `${64 * scale}px ${64 * scale}px`,
          backgroundPositionX: `${-8 * scale}px`,
          backgroundPositionY: `${-8 * scale}px`,
          imageRendering: "pixelated",
        }}
      />
    )
  }

  const url = variant === "body" ? skinBody(username) : skinHead(username)
  return (
    <img
      src={url || "/placeholder.svg"}
      alt={`${username} Minecraft skin`}
      width={size}
      height={size}
      className={cn("shrink-0 object-cover object-top", rounded, className)}
      style={{ width: size, height: size }}
      crossOrigin="anonymous"
    />
  )
}
