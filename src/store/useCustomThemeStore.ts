import { create } from 'zustand'
import { persist } from 'zustand/middleware'

// Интерфейс для кастомных настроек темы
export interface CustomThemeSettings {
  primaryColor: string // Основная палитра (primary)
  secondaryColor: string // Вторичный цвет
  textColor: string // Цвет букв (всех)
  selfMessageColor: string // Цвет себя в переписке
  otherMessageColor: string // Цвет других людей в переписке
}

// Дефолтные значения используются в useEffect в CustomizationModal

interface CustomThemeState {
  customSettings: CustomThemeSettings | null
  isCustomThemeActive: boolean
  isLoading: boolean
  error: string | null

  // Actions
  setCustomSettings: (settings: CustomThemeSettings) => void
  applyCustomTheme: () => void
  resetToDefaults: () => void
  loadCustomTheme: (userId: string) => Promise<void>
  saveCustomTheme: (userId: string) => Promise<boolean>
  setLoading: (loading: boolean) => void
  setError: (error: string | null) => void
}

const useCustomThemeStore = create<CustomThemeState>()(
  persist(
    (set, get) => ({
      customSettings: null,
      isCustomThemeActive: false,
      isLoading: false,
      error: null,

      setCustomSettings: (settings: CustomThemeSettings) => {
        set({ customSettings: settings, isCustomThemeActive: true })
        get().applyCustomTheme()
      },

      applyCustomTheme: () => {
        const state = get()
        if (!state.customSettings || !state.isCustomThemeActive) return

        if (typeof window !== 'undefined') {
          const root = document.documentElement

          // Применяем кастомные CSS переменные
          root.style.setProperty('--custom-primary', state.customSettings.primaryColor)
          root.style.setProperty('--custom-secondary', state.customSettings.secondaryColor)
          root.style.setProperty('--custom-text', state.customSettings.textColor)
          root.style.setProperty('--custom-self-message', state.customSettings.selfMessageColor)
          root.style.setProperty('--custom-other-message', state.customSettings.otherMessageColor)

          // Добавляем класс для активации кастомной темы
          root.classList.add('custom-theme-active')

          // Принудительное обновление DOM для применения стилей
          root.style.display = 'none'
          void root.offsetHeight // trigger reflow
          root.style.display = ''
        }
      },

      resetToDefaults: () => {
        set({
          customSettings: null,
          isCustomThemeActive: false,
          error: null
        })

        if (typeof window !== 'undefined') {
          const root = document.documentElement

          // Сбрасываем кастомные CSS переменные
          root.style.removeProperty('--custom-primary')
          root.style.removeProperty('--custom-secondary')
          root.style.removeProperty('--custom-text')
          root.style.removeProperty('--custom-self-message')
          root.style.removeProperty('--custom-other-message')

          // Убираем класс кастомной темы
          root.classList.remove('custom-theme-active')
        }
      },

      loadCustomTheme: async (userId: string) => {
        try {
          set({ isLoading: true, error: null })

          // Импорт здесь, чтобы избежать циклических зависимостей
          const { createClient } = await import('@/utils/supabase/client')
          const supabase = createClient()

          const { data, error } = await supabase
            .from('user_custom_themes')
            .select('settings')
            .eq('user_id', userId)
            .single()

          if (error && error.code !== 'PGRST116') { // PGRST116 - не найдена запись
            throw error
          }

          if (data?.settings) {
            const settings = data.settings as CustomThemeSettings
            set({
              customSettings: settings,
              isCustomThemeActive: true,
              isLoading: false
            })
            get().applyCustomTheme()
          } else {
            set({ isLoading: false })
          }
        } catch (error) {
          console.error('Failed to load custom theme:', error)
          set({
            error: 'Не удалось загрузить настройки темы',
            isLoading: false
          })
        }
      },

      saveCustomTheme: async (userId: string): Promise<boolean> => {
        try {
          set({ isLoading: true, error: null })

          const state = get()
          if (!state.customSettings) {
            throw new Error('Нет настроек для сохранения')
          }

          // Импорт здесь, чтобы избежать циклических зависимостей
          const { createClient } = await import('@/utils/supabase/client')
          const supabase = createClient()

          // Используем upsert для вставки или обновления записи
          const { error } = await supabase
            .from('user_custom_themes')
            .upsert({
              user_id: userId,
              settings: state.customSettings,
              updated_at: new Date().toISOString()
            }, {
              onConflict: 'user_id',
              ignoreDuplicates: false
            })

          if (error) throw error

          set({ isLoading: false })
          return true
        } catch (error) {
          console.error('Failed to save custom theme:', error)
          set({
            error: 'Не удалось сохранить настройки темы',
            isLoading: false
          })
          return false
        }
      },

      setLoading: (loading: boolean) => set({ isLoading: loading }),
      setError: (error: string | null) => set({ error })
    }),
    {
      name: 'custom-theme-storage',
      // Не сохраняем loading и error в localStorage
      partialize: (state) => ({
        customSettings: state.customSettings,
        isCustomThemeActive: state.isCustomThemeActive
      }),
      onRehydrateStorage: () => (state) => {
        // Применяем тему при гидратации
        if (state?.isCustomThemeActive && state?.customSettings) {
          setTimeout(() => {
            state.applyCustomTheme()
          }, 0)
        }
      }
    }
  )
)

export default useCustomThemeStore
