'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { 
  diagnoseDesktopToMobileAudioIssues, 
  autoFixDesktopToMobileAudio,
  isMobileDevice 
} from '@/utils/mobileAudioFix'
import { diagnoseCodecCompatibility } from '@/hooks/useWebRTC/peerConfig'

interface DiagnosticReport {
  timestamp: string
  issue: string
  platform: any
  audio: any
  webrtc: any
  recommendations: string[]
}

export const AudioDiagnosticPanel = () => {
  const [isOpen, setIsOpen] = useState(false)
  const [diagnosticReport, setDiagnosticReport] = useState<DiagnosticReport | null>(null)
  const [autoFixResults, setAutoFixResults] = useState<string[]>([])
  const [isRunningDiagnostics, setIsRunningDiagnostics] = useState(false)
  const [isRunningAutoFix, setIsRunningAutoFix] = useState(false)

  const runDiagnostics = async () => {
    setIsRunningDiagnostics(true)
    try {
      console.log('🔧 Запуск диагностики звука...')
      
      // Запускаем обе диагностики параллельно
      const [mobileReport, codecReport] = await Promise.all([
        diagnoseDesktopToMobileAudioIssues(),
        diagnoseCodecCompatibility()
      ])
      
      // Объединяем результаты
      const combinedReport = {
        ...mobileReport,
        webrtc: {
          ...mobileReport.webrtc,
          codecDiagnostics: codecReport
        }
      }
      
      setDiagnosticReport(combinedReport)
      
      console.log('🔧 Диагностика завершена:', combinedReport)
      
    } catch (error) {
      console.error('🔧 Ошибка диагностики:', error)
      setDiagnosticReport({
        timestamp: new Date().toISOString(),
        issue: 'diagnostic-error',
        platform: { error: error.message },
        audio: {},
        webrtc: {},
        recommendations: [`❌ Ошибка диагностики: ${error.message}`]
      })
    } finally {
      setIsRunningDiagnostics(false)
    }
  }

  const runAutoFix = async () => {
    setIsRunningAutoFix(true)
    try {
      console.log('🔧 Запуск автоисправления...')
      const fixes = await autoFixDesktopToMobileAudio()
      setAutoFixResults(fixes)
      console.log('🔧 Автоисправление завершено:', fixes)
    } catch (error) {
      console.error('🔧 Ошибка автоисправления:', error)
      setAutoFixResults([`❌ Ошибка автоисправления: ${error.message}`])
    } finally {
      setIsRunningAutoFix(false)
    }
  }

  const getStatusIcon = (recommendation: string) => {
    if (recommendation.startsWith('✅')) return '✅'
    if (recommendation.startsWith('⚠️')) return '⚠️'  
    if (recommendation.startsWith('❌')) return '❌'
    if (recommendation.startsWith('🔧')) return '🔧'
    if (recommendation.startsWith('📱')) return '📱'
    if (recommendation.startsWith('💻')) return '💻'
    return '📋'
  }

  const getStatusColor = (recommendation: string) => {
    if (recommendation.startsWith('✅')) return 'text-green-600'
    if (recommendation.startsWith('⚠️')) return 'text-yellow-600'
    if (recommendation.startsWith('❌')) return 'text-red-600'
    return 'text-blue-600'
  }

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              🔧 Диагностика звука
            </CardTitle>
            <CardDescription>
              Инструмент для решения проблем передачи звука компьютер ↔ телефон
            </CardDescription>
          </div>
          <Collapsible open={isOpen} onOpenChange={setIsOpen}>
            <CollapsibleTrigger asChild>
              <Button variant="outline" size="sm">
                {isOpen ? 'Скрыть' : 'Показать'}
              </Button>
            </CollapsibleTrigger>
          </Collapsible>
        </div>
      </CardHeader>

      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleContent>
          <CardContent className="space-y-4">
            {/* Основные действия */}
            <div className="flex gap-2 flex-wrap">
              <Button 
                onClick={runDiagnostics}
                disabled={isRunningDiagnostics}
                variant="outline"
                className="flex-1 min-w-[150px]"
              >
                {isRunningDiagnostics ? (
                  <>🔄 Диагностика...</>
                ) : (
                  <>🔍 Запустить диагностику</>
                )}
              </Button>
              
              <Button 
                onClick={runAutoFix}
                disabled={isRunningAutoFix}
                variant="default"
                className="flex-1 min-w-[150px]"
              >
                {isRunningAutoFix ? (
                  <>🔄 Исправление...</>
                ) : (
                  <>🔧 Автоисправление</>
                )}
              </Button>
            </div>

            {/* Быстрая информация */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <div className="text-sm font-medium text-blue-800 mb-2">
                Быстрая информация:
              </div>
              <div className="text-sm text-blue-700 space-y-1">
                <div>• Платформа: {isMobileDevice() ? '📱 Мобильная' : '💻 Десктоп'}</div>
                <div>• Проблема: Звук не передается с компьютера на телефон</div>
                <div>• Решение: Унифицированные настройки аудио кодеков</div>
              </div>
            </div>

            {/* Результат автоисправления */}
            {autoFixResults.length > 0 && (
              <div className="border border-green-200 rounded-lg p-4 bg-green-50">
                <h4 className="font-semibold text-green-800 mb-2">
                  🔧 Результат автоисправления:
                </h4>
                <ul className="space-y-2">
                  {autoFixResults.map((fix, index) => (
                    <li 
                      key={index} 
                      className={`text-sm ${getStatusColor(fix)} flex items-start gap-2`}
                    >
                      <span className="mt-0.5">{getStatusIcon(fix)}</span>
                      <span>{fix.replace(/^[✅❌⚠️🔧📱💻]\s*/, '')}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Результат диагностики */}
            {diagnosticReport && (
              <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                <h4 className="font-semibold mb-3">📋 Отчет диагностики:</h4>
                
                {/* Рекомендации */}
                <div className="mb-4">
                  <h5 className="font-medium mb-2">🎯 Рекомендации:</h5>
                  <ul className="space-y-2">
                    {diagnosticReport.recommendations.map((rec, index) => (
                      <li 
                        key={index} 
                        className={`text-sm ${getStatusColor(rec)} flex items-start gap-2`}
                      >
                        <span className="mt-0.5">{getStatusIcon(rec)}</span>
                        <span>{rec.replace(/^[✅❌⚠️🔧📱💻]\s*/, '')}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Техническая информация */}
                <Collapsible>
                  <CollapsibleTrigger asChild>
                    <Button variant="ghost" size="sm" className="text-xs">
                      📊 Показать техническую информацию
                    </Button>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="mt-2">
                    <div className="text-xs bg-white border rounded p-3 font-mono">
                      <div className="mb-2">
                        <strong>Платформа:</strong>
                        <pre className="mt-1 whitespace-pre-wrap">
                          {JSON.stringify(diagnosticReport.platform, null, 2)}
                        </pre>
                      </div>
                      
                      <div className="mb-2">
                        <strong>Аудио:</strong>
                        <pre className="mt-1 whitespace-pre-wrap">
                          {JSON.stringify(diagnosticReport.audio, null, 2)}
                        </pre>
                      </div>
                      
                      <div>
                        <strong>WebRTC кодеки:</strong>
                        <pre className="mt-1 whitespace-pre-wrap">
                          {JSON.stringify(diagnosticReport.webrtc, null, 2)}
                        </pre>
                      </div>
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              </div>
            )}

            {/* Инструкции */}
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
              <div className="text-sm font-medium text-yellow-800 mb-2">
                📝 Пошаговые инструкции:
              </div>
              <ol className="text-sm text-yellow-700 space-y-1 list-decimal list-inside">
                <li>Нажмите "Запустить диагностику" для анализа проблемы</li>
                <li>Нажмите "Автоисправление" для автоматического решения</li>
                <li>Перезапустите звонок после применения исправлений</li>
                <li>Если проблема сохранится, обратитесь к техподдержке с отчетом</li>
              </ol>
            </div>
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  )
}

export default AudioDiagnosticPanel
