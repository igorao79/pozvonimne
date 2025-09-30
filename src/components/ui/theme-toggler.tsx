"use client";

import { Moon, SunDim } from "lucide-react";
import { useRef, useEffect } from "react";
import { flushSync } from "react-dom";
import { cn } from "@/lib/utils";
import useThemeStore from "@/store/useThemeStore";

type Props = {
  className?: string;
};

export const ThemeToggler = ({ className }: Props) => {
  const { theme, toggleTheme, initSystemThemeListener } = useThemeStore();
  const buttonRef = useRef<HTMLButtonElement | null>(null);

  // Initialize system theme listener on mount (only in Electron)
  useEffect(() => {
    if (typeof window !== 'undefined' && window.electronAPI) {
      initSystemThemeListener();
    }
  }, [initSystemThemeListener]);

  // Note: Theme application is now handled only in useThemeStore to prevent conflicts

  const handleToggle = async () => {
    if (!buttonRef.current) return;

    const isElectron = typeof window !== 'undefined' && window.electronAPI;

    if (isElectron) {
      // Ultra-fast wave animation for Electron
      const { top, left, width, height } = buttonRef.current.getBoundingClientRect();
      const y = top + height / 2;
      const x = left + width / 2;

      const right = window.innerWidth - left;
      const bottom = window.innerHeight - top;
      const maxRad = Math.hypot(Math.max(left, right), Math.max(top, bottom));

      // Start theme switch immediately
      toggleTheme();

      // Lightning fast wave animation (120ms total)
      const root = document.documentElement;
      root.animate(
        {
          clipPath: [
            `circle(0px at ${x}px ${y}px)`,
            `circle(${maxRad}px at ${x}px ${y}px)`,
          ],
        },
        {
          duration: 120, // Extremely fast wave
          easing: "ease-out",
          fill: "forwards",
        },
      );
    } else {
      // Use View Transitions for web browsers
      if (document.startViewTransition) {
        document.startViewTransition(() => {
          flushSync(() => {
            toggleTheme();
          });
        });
      } else {
        toggleTheme();
      }
    }
  };

  return (
    <button
      ref={buttonRef}
      onClick={handleToggle}
      className={cn(
        "p-2 rounded-md theme-button hover:bg-secondary/80 hover:ring-2 hover:ring-secondary/60 dark:hover:bg-gray-600 dark:hover:ring-gray-300 transition-colors-smooth border border-border cursor-pointer gpu-accelerated",
        className
      )}
      style={{
        // Дополнительные стили для темной темы
        '--tw-ring-color': 'var(--color-ring)',
      } as React.CSSProperties}
      aria-label={theme === 'dark' ? 'Переключить на светлую тему' : 'Переключить на тёмную тему'}
    >
      {theme === 'dark' ? (
        <SunDim className="h-5 w-5 text-foreground" />
      ) : (
        <Moon className="h-5 w-5 text-foreground" />
      )}
    </button>
  );
};
