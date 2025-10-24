'use client'

import { useState, useEffect, useRef } from 'react'
import { gsap } from 'gsap'
import { useGSAP } from '@gsap/react'
import useSupabaseStore from '@/store/useSupabaseStore'
import useCallStore from '@/store/useCallStore'
import { Star, Sparkles } from 'lucide-react'

// Регистрируем useGSAP хук
gsap.registerPlugin(useGSAP)

interface UserCounterAnimatedProps {
  userCount: number
  onAnimationStart?: () => void
  onAnimationComplete?: () => void
}

export const UserCounterAnimated = ({ 
  userCount, 
  onAnimationStart,
  onAnimationComplete
}: UserCounterAnimatedProps) => {
  const containerRef = useRef<HTMLDivElement>(null)
  const numberRef = useRef<HTMLSpanElement>(null)
  const starsLeftRef = useRef<HTMLDivElement>(null)
  const starsRightRef = useRef<HTMLDivElement>(null)
  const starsCenterRef = useRef<HTMLDivElement>(null)
  
  const [animationComplete, setAnimationComplete] = useState(false)

  // Вычисляем стартовые позиции для звездочек
  const getStarPosition = (index: number) => {
    const side = index % 8
    let startX = 0, startY = 0

    switch(side) {
      case 0: // сверху по центру
        startX = Math.random() * 240 - 120
        startY = -250
        break
      case 1: // сверху-справа
        startX = 200 + Math.random() * 150
        startY = -150 - Math.random() * 100
        break
      case 2: // справа по центру
        startX = 350
        startY = Math.random() * 200 - 100
        break
      case 3: // снизу-справа
        startX = 200 + Math.random() * 150
        startY = 150 + Math.random() * 100
        break
      case 4: // снизу по центру
        startX = Math.random() * 240 - 120
        startY = 250
        break
      case 5: // снизу-слева
        startX = -200 - Math.random() * 150
        startY = 150 + Math.random() * 100
        break
      case 6: // слева по центру
        startX = -350
        startY = Math.random() * 200 - 100
        break
      case 7: // сверху-слева
        startX = -200 - Math.random() * 150
        startY = -150 - Math.random() * 100
        break
    }

    return {
      x: Math.round(startX),
      y: Math.round(startY),
      rotation: Math.round(Math.random() * 360 - 180)
    }
  }

  // Главный useGSAP хук для всех анимаций
  useGSAP(() => {
    if (!numberRef.current) return

    onAnimationStart?.()

    // Сразу делаем цифры зелеными
    gsap.set(numberRef.current, { color: '#22c55e' })

    // Создаем объект для анимации числа
    const animObj = { value: 0 }
    
    // Анимация перебора случайных чисел (быстрая фаза)
    const randomTl = gsap.timeline()
    
    // Быстрый перебор случайных чисел (1.5 секунды)
    randomTl.to(animObj, {
      duration: 1.5,
      ease: "power2.out",
      onUpdate: () => {
        if (numberRef.current) {
          // Генерируем случайные числа в диапазоне от 50 до finalNumber + 200
          const randomValue = Math.floor(Math.random() * (userCount + 150) + 50)
          numberRef.current.textContent = randomValue.toString()
        }
      }
    })

    // Плавный переход к финальному числу (1 секунда)
    randomTl.to(animObj, {
      value: userCount,
      duration: 1,
      ease: "power3.out",
      onUpdate: () => {
        if (numberRef.current) {
          const currentValue = Math.round(animObj.value)
          numberRef.current.textContent = currentValue.toString()
        }
      },
      onComplete: () => {
        // Запускаем анимацию звездочек
        setAnimationComplete(true)
        animateStars()
      }
    })

    // Анимация звездочек
    const animateStars = () => {
      if (!starsLeftRef.current || !starsRightRef.current || !starsCenterRef.current) {
        return
      }

      // Получаем все звездочки из трех групп
      const allStars = [
        ...Array.from(starsLeftRef.current.children),
        ...Array.from(starsRightRef.current.children),
        ...Array.from(starsCenterRef.current.children)
      ]

      // Главный timeline для анимации
      const masterTl = gsap.timeline()

      // Создаем массив занятых позиций для предотвращения наложения
      const occupiedPositions: { x: number; y: number }[] = []

      // Звездочки уже имеют стартовые позиции за пределами плашки
      allStars.forEach((star, index) => {
        // Находим свободную позицию внутри плашки, избегая занятых
        let finalX: number, finalY: number
        let attempts = 0
        do {
          // Уменьшенный радиус для мобильных устройств
          finalX = gsap.utils.random(-60, 60)
          finalY = gsap.utils.random(-45, 45)
          attempts++
          // Проверяем, не слишком ли близко к занятым позициям
          const tooClose = occupiedPositions.some(pos =>
            Math.abs(pos.x - finalX) < 25 && Math.abs(pos.y - finalY) < 25
          )
          if (!tooClose || attempts > 10) break
        } while (true)

        occupiedPositions.push({ x: finalX, y: finalY })

        // Анимация влета каждой звездочки в плашку
        masterTl.to(star, {
          opacity: 0.3,
          scale: gsap.utils.random(0.8, 1.2),
          x: finalX,
          y: finalY,
          rotation: gsap.utils.random(-45, 45),
          duration: gsap.utils.random(0.8, 2.0),
          ease: "back.out(1.7)",
          delay: index * 0.06
        }, index * 0.02)
      })

      // После влета начинаем бесконечное движение
      masterTl.add(() => {
        allStars.forEach((star, index) => {
          // Создаем бесконечную анимацию движения
          gsap.to(star, {
            x: `+=${gsap.utils.random(-40, 40)}`,
            y: `+=${gsap.utils.random(-35, 35)}`,
            rotation: `+=${gsap.utils.random(-200, 200)}`,
            duration: gsap.utils.random(4, 8),
            ease: "power1.inOut",
            repeat: -1,
            yoyo: true,
            delay: index * 0.15
          })
        })

        onAnimationComplete?.()
      })
    }

  }, { scope: containerRef, dependencies: [userCount] })

  return (
    <div ref={containerRef} className="relative">
      {/* Левые звездочки */}
      <div
        ref={starsLeftRef}
        className="absolute left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2 z-0 pointer-events-none"
      >
        {[0, 1, 2, 3].map(index => (
          index % 2 === 0 ? (
            <Star
              key={`left-${index}`}
              className="text-foreground dark:text-white w-3 h-3 sm:w-4 sm:h-4 absolute"
              style={{
                transform: `translate(${getStarPosition(index).x}px, ${getStarPosition(index).y}px) rotate(${getStarPosition(index).rotation}deg)`,
                opacity: 0
              }}
            />
          ) : (
            <Sparkles
              key={`left-${index}`}
              className="text-foreground dark:text-white w-3 h-3 sm:w-4 sm:h-4 absolute"
              style={{
                transform: `translate(${getStarPosition(index).x}px, ${getStarPosition(index).y}px) rotate(${getStarPosition(index).rotation}deg)`,
                opacity: 0
              }}
            />
          )
        ))}
      </div>

      {/* Правые звездочки */}
      <div
        ref={starsRightRef}
        className="absolute left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2 z-0 pointer-events-none"
      >
        {[4, 5, 6, 7].map(index => (
          index % 2 === 0 ? (
            <Star 
              key={`right-${index}`}
              className="text-foreground dark:text-white w-3 h-3 sm:w-4 sm:h-4 absolute"
              style={{
                transform: `translate(${getStarPosition(index).x}px, ${getStarPosition(index).y}px) rotate(${getStarPosition(index).rotation}deg)`,
                opacity: 0
              }}
            />
          ) : (
            <Sparkles 
              key={`right-${index}`}
              className="text-foreground dark:text-white w-3 h-3 sm:w-4 sm:h-4 absolute"
              style={{
                transform: `translate(${getStarPosition(index).x}px, ${getStarPosition(index).y}px) rotate(${getStarPosition(index).rotation}deg)`,
                opacity: 0
              }}
            />
          )
        ))}
      </div>

      {/* Центральные звездочки */}
      <div
        ref={starsCenterRef}
        className="absolute left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2 z-0 pointer-events-none"
      >
        {[8, 9, 10, 11, 12].map(index => (
          index % 2 === 0 ? (
            <Star 
              key={`center-${index}`}
              className="text-foreground dark:text-yellow-300 w-3 h-3 sm:w-4 sm:h-4 absolute"
              style={{
                transform: `translate(${getStarPosition(index).x}px, ${getStarPosition(index).y}px) rotate(${getStarPosition(index).rotation}deg)`,
                opacity: 0
              }}
            />
          ) : (
            <Sparkles 
              key={`center-${index}`}
              className="text-foreground dark:text-yellow-300 w-3 h-3 sm:w-4 sm:h-4 absolute"
              style={{
                transform: `translate(${getStarPosition(index).x}px, ${getStarPosition(index).y}px) rotate(${getStarPosition(index).rotation}deg)`,
                opacity: 0
              }}
            />
          )
        ))}
      </div>

      {/* Центрированное число - поверх звездочек */}
      <div className="flex flex-col items-center justify-center relative z-10">
        <span
          ref={numberRef}
          className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold text-green-500 transition-colors duration-500 mb-1 sm:mb-2"
        >
          {userCount}
        </span>
        <p className="text-xs sm:text-sm text-muted-foreground">
          активных пользователей
        </p>
      </div>
    </div>
  )
}
