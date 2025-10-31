'use client'

import { useState } from 'react'
import { Palette } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { CustomizationModal } from '../Customization'

const CustomizationSection = () => {
  const [isModalOpen, setIsModalOpen] = useState(false)

  return (
    <>
      <div className="animate-in slide-in-from-bottom-2 duration-300 delay-600">
        <div className="flex items-center justify-between p-4 bg-card rounded-lg border border-border">
          <div className="flex items-center gap-3">
            <div className="customization-icon-bg p-2 rounded-lg">
              <Palette className="preserve-icon-color customization-icon w-5 h-5" />
            </div>
            <div>
              <h3 className="font-medium text-foreground">Оформление</h3>
              <p className="text-sm text-muted-foreground">
                Настройте цвета и внешний вид приложения
              </p>
            </div>
          </div>
          <Button
            onClick={() => setIsModalOpen(true)}
            variant="outline"
            size="sm"
          >
            Настроить
          </Button>
        </div>
      </div>

      <CustomizationModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />
    </>
  )
}

export default CustomizationSection
