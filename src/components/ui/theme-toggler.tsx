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

  // Apply theme on mount and theme change
  useEffect(() => {
    if (typeof window !== 'undefined') {
      document.documentElement.classList.remove('light', 'dark');
      document.documentElement.classList.add(theme);
      document.documentElement.setAttribute('data-theme', theme);
    }
  }, [theme]);

  const handleToggle = async () => {
    if (!buttonRef.current) return;

    const { top, left, width, height } = buttonRef.current.getBoundingClientRect();
    const y = top + height / 2;
    const x = left + width / 2;

    // Check if browser supports View Transitions
    if (document.startViewTransition) {
      await document.startViewTransition(() => {
        flushSync(() => {
          toggleTheme();
        });
      }).ready;

      // Apply animation with optimized settings
      const right = window.innerWidth - left;
      const bottom = window.innerHeight - top;
      const maxRad = Math.hypot(Math.max(left, right), Math.max(top, bottom));

      // Use requestAnimationFrame for smoother Electron animations
      const isElectron = typeof window !== 'undefined' && window.electronAPI;
      const duration = isElectron ? 500 : 700; // Slightly longer for Electron to ensure smoothness

      document.documentElement.animate(
        {
          clipPath: [
            `circle(0px at ${x}px ${y}px)`,
            `circle(${maxRad}px at ${x}px ${y}px)`,
          ],
        },
        {
          duration: duration,
          easing: "ease-in-out",
          pseudoElement: "::view-transition-new(root)",
        },
      );
    } else {
      // Fallback for browsers without View Transitions support
      toggleTheme();
    }
  };

  return (
    <button
      ref={buttonRef}
      onClick={handleToggle}
      className={cn(
        "p-2 rounded-md theme-button hover:bg-secondary/80 hover:ring-2 hover:ring-secondary/60 dark:hover:bg-gray-600 dark:hover:ring-gray-300 !transition-all !duration-200 border border-border cursor-pointer",
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
