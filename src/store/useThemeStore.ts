import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type Theme = 'light' | 'dark'

interface ThemeState {
  theme: Theme
  setTheme: (theme: Theme) => void
  toggleTheme: () => void
}

const useThemeStore = create<ThemeState>()(
  persist(
    (set, get) => ({
      theme: 'light',
      setTheme: (theme: Theme) => {
        set({ theme })

        // Простое применение темы к документу
        if (typeof window !== 'undefined') {
          const root = document.documentElement
          root.classList.remove('light', 'dark')
          root.classList.add(theme)
          root.setAttribute('data-theme', theme)
        }
      },
      toggleTheme: () => {
        const currentTheme = get().theme
        const newTheme: Theme = currentTheme === 'light' ? 'dark' : 'light'
        get().setTheme(newTheme)
      },
    }),
    {
      name: 'theme-storage',
      onRehydrateStorage: () => (state) => {
        // Простое применение темы при гидратации
        if (state && typeof window !== 'undefined') {
          document.documentElement.classList.remove('light', 'dark')
          document.documentElement.classList.add(state.theme)
          document.documentElement.setAttribute('data-theme', state.theme)
        }
      },
    }
  )
)

export default useThemeStore
