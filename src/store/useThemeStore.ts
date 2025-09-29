import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type Theme = 'light' | 'dark'

interface ThemeState {
  theme: Theme
  systemTheme: Theme
  setTheme: (theme: Theme) => void
  toggleTheme: () => void
  setSystemTheme: (theme: Theme) => void
  initSystemThemeListener: () => void
}

const useThemeStore = create<ThemeState>()(
  persist(
    (set, get) => ({
      theme: 'light',
      systemTheme: 'light',
      setTheme: (theme: Theme) => {
        set({ theme })

        // Apply theme to document with smooth transition for animations
        if (typeof window !== 'undefined') {
          const root = document.documentElement

          // For Electron, use a more efficient approach to avoid animation conflicts
          if (window.electronAPI) {
            // Use requestAnimationFrame for smooth theme switching
            requestAnimationFrame(() => {
              // Remove old classes
              root.classList.remove('light', 'dark')
              // Add new theme
              root.classList.add(theme)
              root.setAttribute('data-theme', theme)

              // Update CSS custom properties
              const isDark = theme === 'dark'
              root.style.setProperty('--color-background', isDark ? '#0f172a' : '#ffffff')
              root.style.setProperty('--color-foreground', isDark ? '#f8fafc' : '#0f172a')
              root.style.setProperty('--color-card', isDark ? '#1e293b' : '#ffffff')
              root.style.setProperty('--color-card-foreground', isDark ? '#f8fafc' : '#0f172a')
            })
          } else {
            // Standard approach for web browsers
            root.classList.remove('light', 'dark')
            root.classList.add(theme)
            root.setAttribute('data-theme', theme)
          }
        }
      },
      toggleTheme: () => {
        const currentTheme = get().theme
        const newTheme: Theme = currentTheme === 'light' ? 'dark' : 'light'
        get().setTheme(newTheme)
      },
      setSystemTheme: (theme: Theme) => {
        set({ systemTheme: theme })
      },

      // Initialize system theme listener for Electron
      initSystemThemeListener: () => {
        if (typeof window !== 'undefined' && window.electronAPI) {
          // Listen for system theme changes
          window.addEventListener('system-theme-changed', (event: any) => {
            const systemTheme = event.detail;
            get().setSystemTheme(systemTheme as Theme);
            console.log('🎨 System theme updated to:', systemTheme);
          });

          // Get initial system theme
          window.electronAPI.getSystemTheme().then((systemTheme: string) => {
            get().setSystemTheme(systemTheme as Theme);
            console.log('🎨 Initial system theme:', systemTheme);
          }).catch(console.error);
        }
      },
    }),
    {
      name: 'theme-storage',
      onRehydrateStorage: () => (state) => {
        // Apply theme on hydration with delay for Electron
        if (state && typeof window !== 'undefined') {
          const applyTheme = () => {
            document.documentElement.classList.remove('light', 'dark')
            document.documentElement.classList.add(state.theme)
            document.documentElement.setAttribute('data-theme', state.theme)
          }

          if (window.electronAPI) {
            // Delay for Electron to ensure DOM is ready
            setTimeout(applyTheme, 100)
          } else {
            applyTheme()
          }
        }
      },
    }
  )
)

export default useThemeStore
