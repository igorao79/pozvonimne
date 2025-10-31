'use client'

import { useState, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { X, RotateCcw, Save } from 'lucide-react'
import { Sketch } from '@uiw/react-color'
import useCustomThemeStore, { CustomThemeSettings } from '@/store/useCustomThemeStore'
import useCallStore from '@/store/useCallStore'
import { Button } from '@/components/ui/button'
import { MiniDemo } from './MiniDemo'

interface CustomizationModalProps {
  isOpen: boolean
  onClose: () => void
}

const CustomizationModal = ({ isOpen, onClose }: CustomizationModalProps) => {
  const { user } = useCallStore()
  const {
    customSettings,
    isCustomThemeActive,
    isLoading,
    error,
    setCustomSettings,
    resetToDefaults,
    saveCustomTheme,
    loadCustomTheme,
    setError
  } = useCustomThemeStore()

  const [tempSettings, setTempSettings] = useState<CustomThemeSettings>({
    primaryColor: '#0f172a',
    secondaryColor: '#f1f5f9',
    textColor: '#0f172a',
    selfMessageColor: '#3b82f6',
    otherMessageColor: '#e5e7eb'
  })

  const [isSaving, setIsSaving] = useState(false)
  const [activeColorPicker, setActiveColorPicker] = useState<string | null>(null)

  // Обработчик изменения цвета
  const handleColorChange = useCallback((key: keyof CustomThemeSettings, value: string) => {
    const newSettings = { ...tempSettings, [key]: value }
    setTempSettings(newSettings)

    // Применяем изменения сразу для превью - пользователь видит результат в реальном времени
    setCustomSettings(newSettings)
  }, [tempSettings, setCustomSettings])


  // Загружаем настройки при открытии модального окна
  useEffect(() => {
    if (isOpen && user?.id) {
      loadCustomTheme(user.id)
    }
  }, [isOpen, user?.id, loadCustomTheme])

  // Синхронизируем временные настройки с текущими настройками (сохраненными или дефолтными)
  useEffect(() => {
    if (isOpen) {
      // Если кастомная тема активна, используем текущие настройки из состояния
      if (isCustomThemeActive && customSettings) {
        setTempSettings(customSettings)
      } else {
        // Если кастомная тема не активна, используем дефолтные значения
        setTempSettings({
          primaryColor: '#0f172a',
          secondaryColor: '#f1f5f9',
          textColor: '#0f172a',
          selfMessageColor: '#3b82f6',
          otherMessageColor: '#e5e7eb'
        })
      }
    }
  }, [isOpen, isCustomThemeActive, customSettings])


  const handleSave = async () => {
    if (!user?.id) return

    setIsSaving(true)

    // Проверяем, являются ли настройки дефолтными
    const defaultSettings = {
      primaryColor: '#0f172a',
      secondaryColor: '#f1f5f9',
      textColor: '#0f172a',
      selfMessageColor: '#3b82f6',
      otherMessageColor: '#e5e7eb'
    }

    const isDefaultSettings = JSON.stringify(tempSettings) === JSON.stringify(defaultSettings)

    if (isDefaultSettings) {
      // Если настройки дефолтные, удаляем кастомные настройки из базы данных
      try {
        const { createClient } = await import('@/utils/supabase/client')
        const supabase = createClient()

        const { error } = await supabase
          .from('user_custom_themes')
          .delete()
          .eq('user_id', user.id)

        if (error) throw error

        // Сбрасываем состояние
        resetToDefaults()
        setIsSaving(false)
        onClose()
      } catch (error) {
        console.error('Failed to reset to defaults:', error)
        setError('Не удалось сбросить настройки')
        setIsSaving(false)
      }
    } else {
      // Сохраняем кастомные настройки
      setCustomSettings(tempSettings)
      const success = await saveCustomTheme(user.id)
      setIsSaving(false)

      if (success) {
        onClose()
      }
    }
  }

  const handleReset = () => {
    // Просто устанавливаем дефолтные значения в интерфейсе
    // При сохранении они будут удалены из базы данных
    setTempSettings({
      primaryColor: '#0f172a',
      secondaryColor: '#f1f5f9',
      textColor: '#0f172a',
      selfMessageColor: '#3b82f6',
      otherMessageColor: '#e5e7eb'
    })
  }

  if (!isOpen) return null

  // Обработчик клика по фону - закрываем только при клике на фон
  const handleOverlayClick = (e: React.MouseEvent) => {
    // Не закрываем модал если активен цветовой пикер
    if (e.target === e.currentTarget && !activeColorPicker) {
      onClose()
    }
  }

  // Обработчик для закрытия цветового пикера при клике на его overlay
  const handleColorPickerOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      setActiveColorPicker(null)
    }
  }

  // Предотвращаем закрытие при клике внутри модала
  const handleContentClick = (e: React.MouseEvent) => {
    e.stopPropagation()
  }

  const modalContent = (
    <div
      className="fixed inset-0 bg-black/50 flex items-stretch z-50"
      role="dialog"
      aria-modal="true"
      aria-labelledby="customization-modal-title"
      onClick={handleOverlayClick}
    >
      <div
        className="bg-card w-full h-full animate-in fade-in duration-300"
        onClick={handleContentClick}
      >
        <div className="h-full flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-border">
            <h2 id="customization-modal-title" className="text-2xl font-bold text-foreground">
              Оформление приложения
            </h2>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="h-10 w-10 p-0 hover:bg-accent"
              aria-label="Закрыть"
            >
              <X className="h-5 w-5" />
            </Button>
          </div>

          {/* Error message */}
          {error && (
            <div className="mx-6 mt-4 p-4 bg-destructive/10 border border-destructive/20 rounded-lg text-destructive">
              {error}
            </div>
          )}

          {/* Main Content */}
          <div className="flex-1 flex flex-col xl:flex-row min-h-0">
            {/* Settings Panel */}
            <div className="flex-1 xl:flex-[0_0_50%] p-8 overflow-y-auto">
              <div className="max-w-lg mx-auto xl:mx-0">
                <h3 className="text-2xl font-bold text-foreground mb-4">Настройки цветов</h3>
                <p className="text-sm text-muted-foreground mb-6">
                  🎨 <strong>Основная палитра</strong> - цвет фона страницы и карточек<br/>
                  🎨 <strong>Вторичный цвет</strong> - цвет акцентов и кнопок<br/>
                  🎨 <strong>Цвет букв</strong> - цвет всего текста<br/>
                  🎨 Изменения применяются в реальном времени. Нажмите &quot;Сохранить настройки&quot; чтобы зафиксировать изменения.
                </p>

                {/* Основная палитра */}
                <div className="space-y-3">
                  <label className="text-base font-semibold text-foreground">
                    Основная палитра
                  </label>
                  <div className="flex items-center gap-4">
                    <div className="relative">
                      <div
                        className="w-16 h-12 rounded-lg border-2 border-border cursor-pointer shadow-sm hover:shadow-md transition-shadow"
                        style={{ backgroundColor: tempSettings.primaryColor }}
                        onClick={() => setActiveColorPicker(activeColorPicker === 'primary' ? null : 'primary')}
                      />
                      {activeColorPicker === 'primary' && createPortal(
                        <div 
                          className="fixed inset-0 z-[9999] bg-black/30 flex items-center justify-center"
                          onClick={handleColorPickerOverlayClick}
                        >
                          <div 
                            className="bg-white rounded-lg shadow-lg border"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <div className="flex justify-end p-2 border-b">
                              <button
                                onClick={() => setActiveColorPicker(null)}
                                className="text-gray-500 hover:text-gray-700 p-1"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </div>
                            <Sketch
                              color={tempSettings.primaryColor}
                              onChange={(color) => {
                                const newSettings = { ...tempSettings, primaryColor: color.hex }
                                setTempSettings(newSettings)
                                setCustomSettings(newSettings)
                              }}
                            />
                          </div>
                        </div>,
                        document.body
                      )}
                    </div>
                    <input
                      type="text"
                      value={tempSettings.primaryColor}
                      onChange={(e) => handleColorChange('primaryColor', e.target.value)}
                      className="flex-1 px-4 py-3 text-base bg-background border border-border rounded-lg focus:ring-2 focus:ring-ring focus:border-transparent font-mono"
                      placeholder="#000000"
                    />
                  </div>
                </div>

                {/* Вторичный цвет */}
                <div className="space-y-3">
                  <label className="text-base font-semibold text-foreground">
                    Вторичный цвет
                  </label>
                  <div className="flex items-center gap-4">
                    <div className="relative">
                      <div
                        className="w-16 h-12 rounded-lg border-2 border-border cursor-pointer shadow-sm hover:shadow-md transition-shadow"
                        style={{ backgroundColor: tempSettings.secondaryColor }}
                        onClick={() => setActiveColorPicker(activeColorPicker === 'secondary' ? null : 'secondary')}
                      />
                      {activeColorPicker === 'secondary' && createPortal(
                        <div 
                          className="fixed inset-0 z-[9999] bg-black/30 flex items-center justify-center"
                          onClick={handleColorPickerOverlayClick}
                        >
                          <div 
                            className="bg-white rounded-lg shadow-lg border"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <div className="flex justify-end p-2 border-b">
                              <button
                                onClick={() => setActiveColorPicker(null)}
                                className="text-gray-500 hover:text-gray-700 p-1"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </div>
                            <Sketch
                            color={tempSettings.secondaryColor}
                            onChange={(color) => {
                              const newSettings = { ...tempSettings, secondaryColor: color.hex }
                              setTempSettings(newSettings)
                              setCustomSettings(newSettings)
                            }}
                            />
                          </div>
                        </div>,
                        document.body
                      )}
                    </div>
                    <input
                      type="text"
                      value={tempSettings.secondaryColor}
                      onChange={(e) => handleColorChange('secondaryColor', e.target.value)}
                      className="flex-1 px-4 py-3 text-base bg-background border border-border rounded-lg focus:ring-2 focus:ring-ring focus:border-transparent font-mono"
                      placeholder="#f1f5f9"
                    />
                  </div>
                </div>

                {/* Цвет букв */}
                <div className="space-y-3">
                  <label className="text-base font-semibold text-foreground">
                    Цвет букв (всех)
                  </label>
                  <div className="flex items-center gap-4">
                    <div className="relative">
                      <div
                        className="w-16 h-12 rounded-lg border-2 border-border cursor-pointer shadow-sm hover:shadow-md transition-shadow"
                        style={{ backgroundColor: tempSettings.textColor }}
                        onClick={() => setActiveColorPicker(activeColorPicker === 'text' ? null : 'text')}
                      />
                      {activeColorPicker === 'text' && createPortal(
                        <div 
                          className="fixed inset-0 z-[9999] bg-black/30 flex items-center justify-center"
                          onClick={handleColorPickerOverlayClick}
                        >
                          <div 
                            className="bg-white rounded-lg shadow-lg border"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <div className="flex justify-end p-2 border-b">
                              <button
                                onClick={() => setActiveColorPicker(null)}
                                className="text-gray-500 hover:text-gray-700 p-1"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </div>
                            <Sketch
                            color={tempSettings.textColor}
                            onChange={(color) => {
                              const newSettings = { ...tempSettings, textColor: color.hex }
                              setTempSettings(newSettings)
                              setCustomSettings(newSettings)
                            }}
                            />
                          </div>
                        </div>,
                        document.body
                      )}
                    </div>
                    <input
                      type="text"
                      value={tempSettings.textColor}
                      onChange={(e) => handleColorChange('textColor', e.target.value)}
                      className="flex-1 px-4 py-3 text-base bg-background border border-border rounded-lg focus:ring-2 focus:ring-ring focus:border-transparent font-mono"
                      placeholder="#0f172a"
                    />
                  </div>
                </div>

                {/* Цвет себя в переписке */}
                <div className="space-y-3">
                  <label className="text-base font-semibold text-foreground">
                    Цвет себя в переписке
                  </label>
                  <div className="flex items-center gap-4">
                    <div className="relative">
                      <div
                        className="w-16 h-12 rounded-lg border-2 border-border cursor-pointer shadow-sm hover:shadow-md transition-shadow"
                        style={{ backgroundColor: tempSettings.selfMessageColor }}
                        onClick={() => setActiveColorPicker(activeColorPicker === 'selfMessage' ? null : 'selfMessage')}
                      />
                      {activeColorPicker === 'selfMessage' && createPortal(
                        <div 
                          className="fixed inset-0 z-[9999] bg-black/30 flex items-center justify-center"
                          onClick={handleColorPickerOverlayClick}
                        >
                          <div 
                            className="bg-white rounded-lg shadow-lg border"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <div className="flex justify-end p-2 border-b">
                              <button
                                onClick={() => setActiveColorPicker(null)}
                                className="text-gray-500 hover:text-gray-700 p-1"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </div>
                            <Sketch
                            color={tempSettings.selfMessageColor}
                            onChange={(color) => {
                              const newSettings = { ...tempSettings, selfMessageColor: color.hex }
                              setTempSettings(newSettings)
                              setCustomSettings(newSettings)
                            }}
                            />
                          </div>
                        </div>,
                        document.body
                      )}
                    </div>
                    <input
                      type="text"
                      value={tempSettings.selfMessageColor}
                      onChange={(e) => handleColorChange('selfMessageColor', e.target.value)}
                      className="flex-1 px-4 py-3 text-base bg-background border border-border rounded-lg focus:ring-2 focus:ring-ring focus:border-transparent font-mono"
                      placeholder="#3b82f6"
                    />
                  </div>
                </div>

                {/* Цвет других людей в переписке */}
                <div className="space-y-3">
                  <label className="text-base font-semibold text-foreground">
                    Цвет других людей в переписке
                  </label>
                  <div className="flex items-center gap-4">
                    <div className="relative">
                      <div
                        className="w-16 h-12 rounded-lg border-2 border-border cursor-pointer shadow-sm hover:shadow-md transition-shadow"
                        style={{ backgroundColor: tempSettings.otherMessageColor }}
                        onClick={() => setActiveColorPicker(activeColorPicker === 'otherMessage' ? null : 'otherMessage')}
                      />
                      {activeColorPicker === 'otherMessage' && createPortal(
                        <div 
                          className="fixed inset-0 z-[9999] bg-black/30 flex items-center justify-center"
                          onClick={handleColorPickerOverlayClick}
                        >
                          <div 
                            className="bg-white rounded-lg shadow-lg border"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <div className="flex justify-end p-2 border-b">
                              <button
                                onClick={() => setActiveColorPicker(null)}
                                className="text-gray-500 hover:text-gray-700 p-1"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </div>
                            <Sketch
                            color={tempSettings.otherMessageColor}
                            onChange={(color) => {
                              const newSettings = { ...tempSettings, otherMessageColor: color.hex }
                              setTempSettings(newSettings)
                              setCustomSettings(newSettings)
                            }}
                            />
                          </div>
                        </div>,
                        document.body
                      )}
                    </div>
                    <input
                      type="text"
                      value={tempSettings.otherMessageColor}
                      onChange={(e) => handleColorChange('otherMessageColor', e.target.value)}
                      className="flex-1 px-4 py-3 text-base bg-background border border-border rounded-lg focus:ring-2 focus:ring-ring focus:border-transparent font-mono"
                      placeholder="#e5e7eb"
                    />
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex flex-col sm:flex-row gap-4 pt-8 border-t border-border">
                  <Button
                    onClick={handleSave}
                    disabled={isSaving || isLoading}
                    size="lg"
                    className="flex-1 h-12 text-base"
                  >
                    <Save className="w-5 h-5 mr-3" />
                    {isSaving ? 'Сохранение...' : 'Сохранить настройки'}
                  </Button>

                  <Button
                    onClick={handleReset}
                    variant="outline"
                    disabled={isLoading}
                    size="lg"
                    className="flex-1 h-12 text-base"
                  >
                    <RotateCcw className="w-5 h-5 mr-3" />
                    Сбросить к умолчанию
                  </Button>
                </div>
              </div>
            </div>

            {/* Preview Panel */}
            <div className="flex-1 xl:flex-[0_0_50%] p-8 bg-muted/30 border-l border-border overflow-y-auto">
              <div className="sticky top-0">
                <h3 className="text-2xl font-bold text-foreground mb-6">Превью интерфейса</h3>
                <div className="bg-card rounded-xl border border-border shadow-lg overflow-hidden">
                  <MiniDemo settings={tempSettings} />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )

  return createPortal(modalContent, document.body)
}

export default CustomizationModal