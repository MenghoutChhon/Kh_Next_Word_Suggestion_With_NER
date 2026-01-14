import type { Metadata } from 'next'
import { ReactNode } from 'react'
import './globals.css'

export const metadata: Metadata = {
  title: 'Khmer AI Writer',
  description: 'Enterprise Khmer AI writing platform with chat and generation tools.',
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head />
      <body className="bg-background text-foreground">
        {children}
      </body>
    </html>
  )
}
