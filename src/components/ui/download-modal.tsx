'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Download, MessageSquare, Shield, Zap, Globe, Smartphone, Check } from 'lucide-react'

interface DownloadModalProps {
  children: React.ReactNode
}

export function DownloadModal({ children }: DownloadModalProps) {
  const [isDownloading, setIsDownloading] = useState(false)

  const handleDownload = async () => {
    setIsDownloading(true)
    
    try {
      // Прямая ссылка на последний релиз
      const downloadUrl = 'https://github.com/igorao79/pozvonimne/releases/latest/download/Позвони.мне%20Setup.exe'
      
      // Создаем невидимую ссылку для скачивания
      const link = document.createElement('a')
      link.href = downloadUrl
      link.download = 'Позвони.мне Setup.exe'
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      
      // Небольшая задержка для UX
      setTimeout(() => {
        setIsDownloading(false)
      }, 2000)
    } catch (error) {
      console.error('Ошибка при скачивании:', error)
      setIsDownloading(false)
    }
  }

  const features = [
    {
      icon: MessageSquare,
      title: 'Мгновенные сообщения',
      description: 'Общайтесь в реальном времени с любого устройства'
    },
    {
      icon: Smartphone,
      title: 'Видеозвонки HD качества',
      description: 'Кристально чистые звонки с поддержкой WebRTC'
    },
    {
      icon: Shield,
      title: 'Полная безопасность',
      description: 'Шифрование данных и защита приватности'
    },
    {
      icon: Zap,
      title: 'Молниеносная скорость',
      description: 'Оптимизированное приложение без задержек'
    },
    {
      icon: Globe,
      title: 'Кроссплатформенность',
      description: 'Windows, macOS, Linux - работает везде'
    }
  ]

  return (
    <Dialog>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
        <DialogHeader className="text-center space-y-4">
          <div className="mx-auto w-16 h-16 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl flex items-center justify-center">
            <Download className="h-8 w-8 text-white" />
          </div>
          <DialogTitle className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-blue-800 bg-clip-text text-transparent">
            Скачать Позвони.мне
          </DialogTitle>
          <DialogDescription className="text-lg text-muted-foreground">
            Полнофункциональное приложение для общения с друзьями и коллегами
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Преимущества */}
          <div className="grid gap-4">
            <h3 className="text-lg font-semibold text-center mb-2">Почему стоит скачать приложение?</h3>
            {features.map((feature, index) => (
              <div key={index} className="flex items-start space-x-3 p-3 rounded-lg bg-secondary/50 hover:bg-secondary/70 transition-colors">
                <div className="flex-shrink-0 w-10 h-10 bg-blue-500/10 rounded-lg flex items-center justify-center">
                  <feature.icon className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-medium text-foreground">{feature.title}</h4>
                  <p className="text-sm text-muted-foreground mt-1">{feature.description}</p>
                </div>
                <Check className="h-5 w-5 text-green-500 flex-shrink-0" />
              </div>
            ))}
          </div>

          {/* Дополнительные преимущества */}
          <div className="bg-gradient-to-r from-blue-50 to-blue-100 dark:from-blue-950/20 dark:to-blue-900/20 rounded-xl p-6 space-y-3">
            <h4 className="font-semibold text-blue-900 dark:text-blue-100">Эксклюзивные возможности приложения:</h4>
            <ul className="space-y-2 text-sm text-blue-800 dark:text-blue-200">
              <li className="flex items-center space-x-2">
                <Check className="h-4 w-4 text-green-600" />
                <span>Автообновления до последней версии</span>
              </li>
              <li className="flex items-center space-x-2">
                <Check className="h-4 w-4 text-green-600" />
                <span>Уведомления о новых сообщениях</span>
              </li>
              <li className="flex items-center space-x-2">
                <Check className="h-4 w-4 text-green-600" />
                <span>Работа в фоновом режиме</span>
              </li>
              <li className="flex items-center space-x-2">
                <Check className="h-4 w-4 text-green-600" />
                <span>Оптимизированная производительность</span>
              </li>
            </ul>
          </div>

          {/* Кнопка скачивания */}
          <div className="pt-4">
            <Button
              onClick={handleDownload}
              disabled={isDownloading}
              className="w-full h-12 text-lg font-semibold bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white shadow-lg hover:shadow-xl transition-all duration-200"
            >
              {isDownloading ? (
                <div className="flex items-center space-x-2">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  <span>Начинается скачивание...</span>
                </div>
              ) : (
                <div className="flex items-center space-x-2">
                  <Download className="h-5 w-5" />
                  <span>Скачать для Windows (бесплатно)</span>
                </div>
              )}
            </Button>
            <p className="text-xs text-muted-foreground text-center mt-2">
              Размер: ~100 МБ • Совместимо с Windows 10/11
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
