import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import CapacitorSetup from './capacitor-setup'

const inter = Inter({ subsets: ['latin', 'cyrillic'] })

export const metadata: Metadata = {
  title: 'Позвони.мне - Простое приложение для голосовых звонков',
  description: 'Простое и безопасное приложение для аудио звонков с WebRTC',
  icons: {
    icon: '/logo.ico',
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover', // Важно для safe area на устройствах с вырезами
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ru" suppressHydrationWarning>
      <body className={inter.className} suppressHydrationWarning>
        <CapacitorSetup />
        {children}
      </body>
    </html>
  )
}