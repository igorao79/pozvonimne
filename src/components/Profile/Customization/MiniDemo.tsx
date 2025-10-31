'use client'

import { CustomThemeSettings } from '@/store/useCustomThemeStore'
import { Button } from '@/components/ui/button'
import { MessageCircle, User, Settings, Download, Shield, Palette, Crown, ChevronDown } from 'lucide-react'

interface MiniDemoProps {
  settings: CustomThemeSettings
}

export const MiniDemo = ({ settings }: MiniDemoProps) => {
  // Применяем кастомные стили локально для превью
  const demoStyles = {
    '--demo-primary': settings.primaryColor,
    '--demo-secondary': settings.secondaryColor,
    '--demo-text': settings.textColor,
    '--demo-self-message': settings.selfMessageColor,
    '--demo-other-message': settings.otherMessageColor,
  } as React.CSSProperties

  return (
    <div
      className="h-full flex flex-col bg-background"
      style={demoStyles}
    >
      {/* Mini Header */}
      <header
        className="flex items-center justify-between p-3 border-b"
        style={{
          backgroundColor: 'var(--demo-primary)',   /* Основной цвет для фона */
          borderColor: 'var(--demo-secondary)',     /* Вторичный цвет для границы */
          color: 'var(--demo-text)'
        }}
      >
        <div className="flex items-center gap-3">
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center"
            style={{ backgroundColor: 'var(--demo-secondary)' }}  /* Вторичный цвет для акцента */
          >
            <span className="text-sm font-bold" style={{ color: 'var(--demo-primary)' }}>PN</span>
          </div>
          <span className="font-semibold text-sm">PozvonimNe</span>
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="ghost"
            className="h-8 w-8 p-0"
            style={{ color: 'var(--demo-text)' }}
          >
            <Download className="w-4 h-4" style={{ color: 'var(--demo-secondary)' }} />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="h-8 w-8 p-0"
            style={{ color: 'var(--demo-text)' }}
          >
            <Shield className="w-4 h-4" style={{ color: 'var(--demo-secondary)' }} />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="h-8 w-8 p-0"
            style={{ color: 'var(--demo-text)' }}
          >
            <Palette className="w-4 h-4" style={{ color: 'var(--demo-secondary)' }} />
          </Button>
          <div className="w-6 h-6 rounded-full bg-yellow-400"></div>
          <span className="text-xs" style={{ color: 'var(--demo-text)' }}>Тема</span>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar */}
        <div
          className="w-1/3 border-r p-3"
          style={{
            backgroundColor: 'var(--demo-primary)',    /* Основной цвет для фона */
            borderColor: 'var(--demo-secondary)'        /* Вторичный цвет для границы */
          }}
        >
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold" style={{ color: 'var(--demo-text)' }}>Чаты</span>
              <Button size="sm" variant="ghost" className="h-6 w-6 p-0">
                <ChevronDown className="w-3 h-3" style={{ color: 'var(--demo-text)' }} />
              </Button>
            </div>

            {/* Chat List Items */}
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="p-2 rounded-lg cursor-pointer hover:opacity-80"
                  style={{
                    backgroundColor: i === 1 ? 'var(--demo-secondary)' : 'transparent',  /* Вторичный цвет для активного */
                    color: i === 1 ? 'var(--demo-primary)' : 'var(--demo-text)'          /* Основной цвет для текста активного */
                  }}
                >
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-gray-400 flex items-center justify-center">
                      <span className="text-xs">U{i}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate">Пользователь {i}</div>
                      <div className="text-xs opacity-70 truncate">
                        {i === 1 ? 'Привет! Как дела?' : 'Последнее сообщение...'}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Chat Area */}
        <div className="flex-1 flex flex-col">
          {/* Chat Header */}
          <div
            className="p-3 border-b flex items-center justify-between"
            style={{
              backgroundColor: 'var(--demo-primary)',    /* Основной цвет для фона */
              borderColor: 'var(--demo-secondary)'       /* Вторичный цвет для границы */
            }}
          >
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-green-400 flex items-center justify-center">
                <span className="text-xs font-bold">A</span>
              </div>
              <div>
                <div className="text-sm font-semibold" style={{ color: 'var(--demo-text)' }}>Алексей</div>
                <div className="text-xs opacity-70" style={{ color: 'var(--demo-text)' }}>онлайн</div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button size="sm" variant="ghost" className="h-6 w-6 p-0">
                <Settings className="w-3 h-3" style={{ color: 'var(--demo-primary)' }} />
              </Button>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 p-3 space-y-3 overflow-y-auto" style={{ backgroundColor: 'var(--demo-primary)' }}>
            {/* Other person's message */}
            <div className="flex justify-start">
              <div
                className="max-w-[70%] p-2 rounded-lg text-sm"
                style={{
                  backgroundColor: 'var(--demo-other-message)',
                  color: 'var(--demo-text)'
                }}
              >
                Привет! Как дела сегодня?
              </div>
            </div>

            {/* Self message */}
            <div className="flex justify-end">
              <div
                className="max-w-[70%] p-2 rounded-lg text-sm"
                style={{
                  backgroundColor: 'var(--demo-self-message)',
                  color: 'var(--demo-text)'
                }}
              >
                Отлично! Спасибо, что спросил. Работаю над новым проектом.
              </div>
            </div>

            {/* Another message */}
            <div className="flex justify-start">
              <div
                className="max-w-[70%] p-2 rounded-lg text-sm"
                style={{
                  backgroundColor: 'var(--demo-other-message)',
                  color: 'var(--demo-text)'
                }}
              >
                Звучит интересно! Расскажи подробнее.
              </div>
            </div>
          </div>

          {/* Message Input */}
          <div
            className="p-3 border-t"
            style={{
              backgroundColor: 'var(--demo-primary)',    /* Основной цвет для фона */
              borderColor: 'var(--demo-secondary)'       /* Вторичный цвет для границы */
            }}
          >
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Напишите сообщение..."
                className="flex-1 px-3 py-2 rounded-lg border text-sm"
                style={{
                  backgroundColor: 'var(--demo-primary)',  /* Основной цвет для фона поля */
                  borderColor: 'var(--demo-secondary)',    /* Вторичный цвет для границы */
                  color: 'var(--demo-text)'
                }}
              />
              <Button
                size="sm"
                className="px-3"
                style={{
                  backgroundColor: 'var(--demo-secondary)', /* Вторичный цвет для акцента */
                  color: 'var(--demo-primary)'              /* Основной цвет для текста */
                }}
              >
                <MessageCircle className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Info */}
      <div
        className="p-2 text-xs text-center border-t"
        style={{
          backgroundColor: 'var(--demo-primary)',    /* Основной цвет для фона */
          borderColor: 'var(--demo-secondary)',     /* Вторичный цвет для границы */
          color: 'var(--demo-text)'
        }}
      >
        🎨 Превью настроек - изменения в реальном времени
      </div>
    </div>
  )
}
