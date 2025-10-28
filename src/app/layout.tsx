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
      <head>
        {/* Мета-теги для мобильных устройств */}
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />

        {/* Предотвращаем bounce scrolling на iOS */}
        <meta name="format-detection" content="telephone=no" />

        {/* Capacitor специфичные мета-теги */}
        <meta name="capacitor:statusBarStyle" content="light" />
        <meta name="capacitor:statusBarBackgroundColor" content="#ffffff" />

        {/* КРИТИЧНО: Viewport для предотвращения движения status bar */}
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover" />

        {/* РАДИКАЛЬНЫЕ стили для фиксации status bar на реальном устройстве */}
        <style dangerouslySetInnerHTML={{
          __html: `
            /* Полностью отключаем любые эффекты, которые могут двигать status bar */
            * {
              -webkit-transform: translateZ(0);
              transform: translateZ(0);
              -webkit-backface-visibility: hidden;
              backface-visibility: hidden;
              -webkit-perspective: 1000;
              perspective: 1000;
            }

            /* Фиксируем viewport */
            html, body {
              margin: 0;
              padding: 0;
              height: 100%;
              position: relative;
            }

            /* Safe area insets для предотвращения наложения */
            body {
              padding-top: env(safe-area-inset-top);
              padding-bottom: env(safe-area-inset-bottom);
              padding-left: env(safe-area-inset-left);
              padding-right: env(safe-area-inset-right);
            }

            /* Next.js контейнер - предотвращаем любые трансформации */
            #__next {
              position: relative;
              transform: none !important;
              -webkit-transform: none !important;
            }

            /* Мобильные стили - РАДИКАЛЬНО отключаем все эффекты */
            @media (max-width: 768px) {
              html, body {
                overflow-x: hidden;
                -webkit-overflow-scrolling: touch;
              }

              /* Предотвращаем любые анимации и трансформации */
              * {
                transition: none !important;
                animation: none !important;
                transform: none !important;
                -webkit-transform: none !important;
              }

              /* Контейнер приложения */
              #__next {
                height: 100%;
                overflow-y: auto;
                overflow-x: hidden;
              }
            }

            /* iOS специфично - дополнительные фиксы */
            @supports (-webkit-touch-callout: none) {
              body {
                -webkit-transform: translateZ(0);
                transform: translateZ(0);
              }

              #__next {
                -webkit-transform: translateZ(0);
                transform: translateZ(0);
              }
            }
          `
        }} />
      </head>
      <body className={inter.className} suppressHydrationWarning>
        <CapacitorSetup />
        {children}
      </body>
    </html>
  )
}