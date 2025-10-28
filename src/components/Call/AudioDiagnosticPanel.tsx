'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { isMobileDevice, radicalAudioFix } from '@/utils/mobileAudioFix'

export const AudioDiagnosticPanel = () => {
  const [isOpen, setIsOpen] = useState(false)
  const [status, setStatus] = useState<'idle' | 'fixing' | 'success' | 'error'>('idle')
  const [message, setMessage] = useState('')

  const quickFix = async () => {
    setStatus('fixing')
    setMessage('🔥 Выполняем полную перезагрузку аудио...')

    try {
      const fixes = await radicalAudioFix()

      // Проверяем результаты
      const hasErrors = fixes.some(fix => fix.includes('❌'))
      const hasWarnings = fixes.some(fix => fix.includes('⚠️'))

      if (hasErrors) {
        setStatus('error')
        setMessage('❌ Найдены критические ошибки. Проверьте разрешения.')
      } else if (hasWarnings) {
        setStatus('success')
        setMessage('⚠️ Исправления применены с предупреждениями. Попробуйте звонок.')
      } else {
        setStatus('success')
        setMessage('✅ Готово! Перезапустите звонок.')
      }

    } catch (error) {
      setStatus('error')
      setMessage('❌ Ошибка исправления. Попробуйте обновить страницу.')
    }
  }

  const togglePanel = () => {
    setIsOpen(!isOpen)
    if (!isOpen) {
      setStatus('idle')
      setMessage('')
    }
  }

  return (
    <Card className="w-full max-w-sm mx-auto border-orange-200 bg-orange-50/50">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-sm flex items-center gap-1 text-orange-800">
              🔧 Звук
            </CardTitle>
            <CardDescription className="text-xs text-orange-700">
              Проблемы с передачей звука
            </CardDescription>
          </div>
          <Button
            onClick={togglePanel}
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0 text-orange-600 hover:text-orange-800"
          >
            {isOpen ? '−' : '+'}
          </Button>
        </div>
      </CardHeader>

      {isOpen && (
        <CardContent className="pt-0 space-y-2">
          {/* Проблема */}
          <div className="text-xs text-orange-800 bg-orange-100 p-2 rounded">
            Звук не передается {isMobileDevice() ? 'на компьютер' : 'на телефон'}
          </div>

          {/* Кнопка исправления */}
          <Button
            onClick={quickFix}
            disabled={status === 'fixing'}
            size="sm"
            className="w-full text-xs"
            variant={status === 'success' ? 'secondary' : 'default'}
          >
            {status === 'fixing' ? '🔄...' : status === 'success' ? '✅ Готово' : '🔧 Исправить'}
          </Button>

          {/* Сообщение */}
          {message && (
            <div className={`text-xs p-2 rounded text-center ${
              status === 'success'
                ? 'bg-green-100 text-green-800'
                : status === 'error'
                ? 'bg-red-100 text-red-800'
                : 'bg-blue-100 text-blue-800'
            }`}>
              {message}
            </div>
          )}

          {/* Инструкции */}
          {status === 'success' && (
            <div className="text-xs text-gray-600 text-center">
              Перезапустите звонок для применения исправлений
            </div>
          )}
        </CardContent>
      )}
    </Card>
  )
}

export default AudioDiagnosticPanel
