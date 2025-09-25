'use client'

import { useState } from 'react'
import { Star } from 'lucide-react'
import CreatorModal from '@/components/ui/CreatorModal'

interface CreatorBadgeProps {
  className?: string
}

const CreatorBadge = ({ className = '' }: CreatorBadgeProps) => {
  const [isModalOpen, setIsModalOpen] = useState(false)

  const handleClick = () => {
    setIsModalOpen(true)
  }

  return (
    <>
      <button
        onClick={handleClick}
        className={`inline-flex items-center justify-center w-5 h-5 rounded-full bg-gradient-to-r from-yellow-400 to-orange-500 hover:from-yellow-500 hover:to-orange-600 transition-all duration-200 hover:scale-110 cursor-pointer shadow-lg ${className}`}
        title="Создатель приложения Позвони.мне"
        aria-label="Информация о создателе приложения"
      >
        <Star className="w-3 h-3 text-white fill-current" />
      </button>

      <CreatorModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
      />
    </>
  )
}

export default CreatorBadge
