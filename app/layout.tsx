import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Voice AI Demo V2',
  description: 'A multilingual voice AI demo with chat, phone, booking, and analytics flows.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
