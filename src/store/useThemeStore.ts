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

          // Ultra-fast theme switching for Electron to eliminate lag
          if (window.electronAPI) {
            // Add electron-app class for CSS optimizations
            document.body.classList.add('electron-app')

            // Instant theme switch - transitions are disabled in CSS for Electron
            root.className = root.className.replace(/\b(light|dark)\b/g, '') + ' ' + theme
            root.setAttribute('data-theme', theme)
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
            // Remove console.log for production performance
          });

          // Get initial system theme
          window.electronAPI.getSystemTheme().then((systemTheme: string) => {
            get().setSystemTheme(systemTheme as Theme);
            // Remove console.log for production performance
          }).catch(() => {
            // Silent error handling for production
          });
        }
      },
    }),
    {
      name: 'theme-storage',
      onRehydrateStorage: () => (state) => {
        // Apply theme on hydration with delay for Electron
        if (state && typeof window !== 'undefined') {
          const applyTheme = () => {
            // Add electron-app class for CSS optimizations
            if (window.electronAPI) {
              document.body.classList.add('electron-app')
            }

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
