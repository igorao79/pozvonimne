"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { Moon, Sun } from "lucide-react"
import { flushSync } from "react-dom"

import { cn } from "@/lib/utils"
import useThemeStore from "@/store/useThemeStore"
import useCustomThemeStore from "@/store/useCustomThemeStore"

type Props = {
  className?: string
}

export const AnimatedThemeToggler = ({ className }: Props) => {
  const { theme, toggleTheme: storeToggleTheme } = useThemeStore()
  const { isCustomThemeActive } = useCustomThemeStore()
  const [mounted, setMounted] = useState(false)
  const buttonRef = useRef<HTMLButtonElement>(null)

  // Предотвращаем гидратационные ошибки
  useEffect(() => {
    setMounted(true)
  }, [])

  const toggleTheme = useCallback(async () => {
    if (!buttonRef.current || !mounted) return

    // Проверяем поддержку View Transitions API
    if (!document.startViewTransition) {
      // Fallback для браузеров без поддержки
      storeToggleTheme()
      return
    }

    await document.startViewTransition(() => {
      flushSync(() => {
        storeToggleTheme()
      })
    }).ready

    const { top, left, width, height } =
      buttonRef.current.getBoundingClientRect()
    const x = left + width / 2
    const y = top + height / 2
    const maxRadius = Math.hypot(
      Math.max(left, window.innerWidth - left),
      Math.max(top, window.innerHeight - top)
    )
    document.documentElement.animate(
      {
        clipPath: [
          `circle(0px at ${x}px ${y}px)`,
          `circle(${maxRadius}px at ${x}px ${y}px)`,
        ],
      },
      {
        duration: 700,
        easing: "ease-in-out",
        pseudoElement: "::view-transition-new(root)",
      }
    )
  }, [storeToggleTheme, mounted])

  if (!mounted) {
    return (
      <div className={cn(
        "inline-flex h-10 w-10 items-center justify-center rounded-lg border border-input bg-background",
        className
      )}>
        <div className="h-4 w-4 animate-pulse rounded bg-muted" />
      </div>
    )
  }

  return (
    <button
      ref={buttonRef}
      onClick={toggleTheme}
      disabled={isCustomThemeActive}
      className={cn(
        "group relative inline-flex h-10 w-10 items-center justify-center rounded-lg border border-input bg-background transition-all duration-300 hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
        isCustomThemeActive && "cursor-not-allowed opacity-50",
        className
      )}
      aria-label={
        isCustomThemeActive
          ? 'Переключение тем отключено при активной кастомной теме'
          : theme === 'dark' ? 'Переключить на светлую тему' : 'Переключить на тёмную тему'
      }
      title={
        isCustomThemeActive
          ? 'Переключение тем отключено при активной кастомной теме. Сбросьте настройки в профиле, чтобы включить.'
          : undefined
      }
    >
      <div className="relative h-4 w-4">
        {/* Солнце */}
        <Sun
          className={cn(
            "preserve-icon-color absolute inset-0 h-4 w-4 transition-all duration-500 ease-in-out",
            theme === 'dark'
              ? "rotate-90 scale-0 opacity-0"
              : "rotate-0 scale-100 opacity-100"
          )}
        />

        {/* Луна */}
        <Moon
          className={cn(
            "preserve-icon-color absolute inset-0 h-4 w-4 transition-all duration-500 ease-in-out",
            theme === 'dark'
              ? "rotate-0 scale-100 opacity-100"
              : "-rotate-90 scale-0 opacity-0"
          )}
        />
      </div>

      {/* Анимированный фон */}
      <div
        className={cn(
          "absolute inset-0 rounded-lg transition-all duration-300 ease-in-out",
          "bg-gradient-to-br opacity-0 group-hover:opacity-10",
          theme === 'dark'
            ? "from-blue-400 to-purple-400"
            : "from-yellow-400 to-orange-400"
        )}
      />
    </button>
  )
}
