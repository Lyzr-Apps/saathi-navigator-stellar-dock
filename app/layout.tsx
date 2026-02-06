import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { IframeLoggerInit } from '@/components/IframeLoggerInit'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Impact Saathi - India AI Summit 2026',
  description: 'Your bilingual AI assistant for India AI Impact Summit 2026. Discover sessions, manage your schedule, take notes, and navigate the event.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <IframeLoggerInit />
        {children}
      </body>
    </html>
  )
}
