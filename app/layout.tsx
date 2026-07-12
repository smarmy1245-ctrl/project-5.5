import { Analytics } from '@vercel/analytics/next'
import type { CSSProperties } from 'react'
import type { Metadata, Viewport } from 'next'
import { Oswald, Inter } from 'next/font/google'
import { getSiteSettings } from '@/lib/data'
import './globals.css'

const oswald = Oswald({
  subsets: ['latin'],
  variable: '--font-oswald',
  display: 'swap',
})

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
})

export async function generateMetadata(): Promise<Metadata> {
  const { siteTitle } = await getSiteSettings()
  return {
    title: siteTitle,
    description: `${siteTitle} — the LT/HT Minecraft tier ranking list.`,
    generator: 'v0.app',
    manifest: '/manifest.json',
  }
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: '#e11d2e',
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const { overrides } = await getSiteSettings()
  // Saved color overrides are applied as inline CSS custom properties on <html>,
  // which cascade to every element and win over the defaults in globals.css.
  const themeStyle = Object.fromEntries(
    overrides.map((o) => [o.cssVar, o.value]),
  ) as CSSProperties

  return (
    <html
      lang="en"
      className={`${oswald.variable} ${inter.variable} bg-background`}
      style={themeStyle}
    >
      <body className="font-sans antialiased">
        {children}
        {process.env.NODE_ENV === 'production' && <Analytics />}
      </body>
    </html>
  )
}
