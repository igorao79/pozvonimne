'use client'

import { useState, useEffect, useRef } from 'react'
import { gsap } from 'gsap'
import useSupabaseStore from '@/store/useSupabaseStore'
import useCallStore from '@/store/useCallStore'

export const UserCounter = () => {
  const [userCount, setUserCount] = useState<number | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isInitialLoad, setIsInitialLoad] = useState(true)
  const [animationComplete, setAnimationComplete] = useState(false)
  
  const numberRef = useRef<HTMLSpanElement>(null)
  const starsLeftRef = useRef<HTMLDivElement>(null)
  const starsRightRef = useRef<HTMLDivElement>(null)
  const starsCenterRef = useRef<HTMLDivElement>(null)
  
  const { supabase } = useSupabaseStore()
  const { userId } = useCallStore()

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

  const fetchUserCount = async () => {
    console.log('🎯 UserCounter: fetchUserCount called, userId:', userId)

    if (!userId) {
      console.log('❌ UserCounter: userId отсутствует, устанавливаем ошибку')
      setError('Пользователь не авторизован')
      setIsLoading(false)
      return
    }

    try {
      setIsLoading(true)
      setError(null)

      // Получаем количество пользователей из таблицы user_profiles
      const { count, error: countError } = await supabase
        .from('user_profiles')
        .select('*', { count: 'exact', head: true })

      if (countError) {
        throw new Error(`Ошибка запроса: ${countError.message}`)
      }

      const finalCount = count || 0
      console.log('✅ UserCounter: данные загружены, count:', finalCount)
      setUserCount(finalCount)

      // Запускаем анимацию перебора чисел
      startNumberAnimation(finalCount)
    } catch (err) {
      console.error('❌ UserCounter: Ошибка загрузки количества пользователей:', err)
      setError('Не удалось загрузить данные')
    } finally {
      setIsLoading(false)
    }
  }

  const startNumberAnimation = (finalNumber: number) => {
    console.log('🎬 UserCounter: startNumberAnimation called with finalNumber:', finalNumber)

    if (!numberRef.current) {
      console.log('❌ UserCounter: numberRef.current отсутствует')
      return
    }

    // Сразу делаем цифры зелеными
    numberRef.current.style.color = '#22c55e' // text-green-500

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
          const randomValue = Math.floor(Math.random() * (finalNumber + 150) + 50)
          numberRef.current.textContent = randomValue.toString()
        }
      }
    })

    // Плавный переход к финальному числу (1 секунда)
    randomTl.to(animObj, {
      value: finalNumber,
      duration: 1,
      ease: "power3.out",
      onUpdate: () => {
        if (numberRef.current) {
          const currentValue = Math.round(animObj.value)
          numberRef.current.textContent = currentValue.toString()
        }
      },
      onComplete: () => {
        console.log('✨ UserCounter: number animation completed, launching stars animation')
        // Запускаем анимацию звездочек
        setAnimationComplete(true)
        animateStars()
      }
    })
  }

  const animateStars = () => {
    console.log('🌟 UserCounter: animateStars called')

    if (!starsLeftRef.current || !starsRightRef.current || !starsCenterRef.current) {
      console.log('❌ UserCounter: refs отсутствуют:', {
        starsLeftRef: !!starsLeftRef.current,
        starsRightRef: !!starsRightRef.current,
        starsCenterRef: !!starsCenterRef.current
      })
      return
    }

    // Получаем все звездочки из трех групп
    const allStars = [
      ...Array.from(starsLeftRef.current.children),
      ...Array.from(starsRightRef.current.children),
      ...Array.from(starsCenterRef.current.children)
    ]

    console.log('🌟 UserCounter: found stars:', allStars.length)

    // Главный timeline для анимации
    const masterTl = gsap.timeline()

    // Создаем массив занятых позиций для предотвращения наложения
    const occupiedPositions: { x: number; y: number }[] = []

    // Звездочки уже имеют стартовые позиции за пределами плашки из useEffect
    allStars.forEach((star, index) => {
      // Находим свободную позицию внутри плашки, избегая занятых
      let finalX: number, finalY: number
      let attempts = 0
      do {
        finalX = gsap.utils.random(-120, 120)
        finalY = gsap.utils.random(-90, 90)
        attempts++
        // Проверяем, не слишком ли близко к занятым позициям
        const tooClose = occupiedPositions.some(pos =>
          Math.abs(pos.x - finalX) < 25 && Math.abs(pos.y - finalY) < 25
        )
        if (!tooClose || attempts > 10) break
      } while (true)

      occupiedPositions.push({ x: finalX, y: finalY })

      // Анимация влета каждой звездочки в плашку (стартовые позиции уже установлены)
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
          x: `+=${gsap.utils.random(-60, 60)}`,
          y: `+=${gsap.utils.random(-50, 50)}`,
          rotation: `+=${gsap.utils.random(-200, 200)}`,
          duration: gsap.utils.random(4, 8),
          ease: "power1.inOut",
          repeat: -1,
          yoyo: true,
          delay: index * 0.15
        })
      })
    })
  }

  useEffect(() => {
    console.log('🔄 UserCounter: useEffect triggered, userId:', userId)
    fetchUserCount()

    // Обновляем каждые 5 минут
    const interval = setInterval(fetchUserCount, 5 * 60 * 1000)

    return () => clearInterval(interval)
  }, [userId])

  // Эффект начальной загрузки с блюром
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsInitialLoad(false)
    }, 3000)

    return () => clearTimeout(timer)
  }, [])

  return (
    <div className="mt-6 bg-card/80 backdrop-blur-sm rounded-lg border border-border/50 w-full min-h-[160px] sm:min-h-[200px] max-w-sm sm:max-w-md mx-auto
                    p-2 sm:p-3 md:p-4 lg:p-4
                    transition-all duration-300 ease-in-out
                    cursor-default select-none
                    mobile-chatlist-random-fact
                    overflow-hidden">
      
      <div className="flex flex-col h-full">
        <div className="flex-1 flex flex-col justify-center w-full">
          <h4 className={`text-xs sm:text-sm font-medium text-foreground mb-2 transition-all duration-1000 ${
            isInitialLoad ? 'blur-sm' : 'blur-none'
          }`}>
            Нашим сервисом пользуется:
          </h4>

           <div className="flex items-center justify-center px-2 min-h-[80px] sm:min-h-[100px] relative">
             <div className={`w-full transition-all duration-1000 ${
               isInitialLoad ? 'blur-md opacity-60' : 'blur-none opacity-100'
             }`}>
               {isLoading ? (
                 <div className="text-center">
                   <span className="text-xs sm:text-sm text-muted-foreground">
                     Загружаем данные...
                   </span>
                 </div>
               ) : error ? (
                 <div className="text-center">
                   <p className="text-xs sm:text-sm text-muted-foreground mb-1">{error}</p>
                   <button
                     onClick={fetchUserCount}
                     className="text-xs text-primary hover:text-primary/80 transition-colors"
                   >
                     Попробовать снова
                   </button>
                 </div>
               ) : userCount !== null ? (
                 <div className="text-center relative">
                    {/* Левые звездочки */}
                    <div
                      ref={starsLeftRef}
                      className="absolute left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2 z-0 pointer-events-none"
                    >
                      <i className="fas fa-star text-foreground dark:text-white text-base absolute" style={{transform: `translate(${getStarPosition(0).x}px, ${getStarPosition(0).y}px) rotate(${getStarPosition(0).rotation}deg)`, opacity: 0}}></i>
                      <i className="fas fa-star text-foreground dark:text-gray-200 text-base absolute" style={{transform: `translate(${getStarPosition(1).x}px, ${getStarPosition(1).y}px) rotate(${getStarPosition(1).rotation}deg)`, opacity: 0}}></i>
                      <i className="fas fa-sparkles text-foreground dark:text-gray-300 text-base absolute" style={{transform: `translate(${getStarPosition(2).x}px, ${getStarPosition(2).y}px) rotate(${getStarPosition(2).rotation}deg)`, opacity: 0}}></i>
                      <i className="fas fa-star text-foreground dark:text-gray-100 text-base absolute" style={{transform: `translate(${getStarPosition(3).x}px, ${getStarPosition(3).y}px) rotate(${getStarPosition(3).rotation}deg)`, opacity: 0}}></i>
                    </div>

                    {/* Правые звездочки */}
                    <div
                      ref={starsRightRef}
                      className="absolute left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2 z-0 pointer-events-none"
                    >
                      <i className="fas fa-sparkles text-foreground dark:text-gray-100 text-base absolute" style={{transform: `translate(${getStarPosition(4).x}px, ${getStarPosition(4).y}px) rotate(${getStarPosition(4).rotation}deg)`, opacity: 0}}></i>
                      <i className="fas fa-star text-foreground dark:text-gray-300 text-base absolute" style={{transform: `translate(${getStarPosition(5).x}px, ${getStarPosition(5).y}px) rotate(${getStarPosition(5).rotation}deg)`, opacity: 0}}></i>
                      <i className="fas fa-star text-foreground dark:text-gray-200 text-base absolute" style={{transform: `translate(${getStarPosition(6).x}px, ${getStarPosition(6).y}px) rotate(${getStarPosition(6).rotation}deg)`, opacity: 0}}></i>
                      <i className="fas fa-star text-foreground dark:text-white text-base absolute" style={{transform: `translate(${getStarPosition(7).x}px, ${getStarPosition(7).y}px) rotate(${getStarPosition(7).rotation}deg)`, opacity: 0}}></i>
                    </div>

                    {/* Центральные звездочки */}
                    <div
                      ref={starsCenterRef}
                      className="absolute left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2 z-0 pointer-events-none"
                    >
                      <i className="fas fa-star text-foreground dark:text-yellow-200 text-base absolute" style={{transform: `translate(${getStarPosition(8).x}px, ${getStarPosition(8).y}px) rotate(${getStarPosition(8).rotation}deg)`, opacity: 0}}></i>
                      <i className="fas fa-sparkles text-foreground dark:text-yellow-300 text-base absolute" style={{transform: `translate(${getStarPosition(9).x}px, ${getStarPosition(9).y}px) rotate(${getStarPosition(9).rotation}deg)`, opacity: 0}}></i>
                      <i className="fas fa-star text-foreground dark:text-yellow-100 text-base absolute" style={{transform: `translate(${getStarPosition(10).x}px, ${getStarPosition(10).y}px) rotate(${getStarPosition(10).rotation}deg)`, opacity: 0}}></i>
                      <i className="fas fa-star text-foreground dark:text-yellow-400 text-base absolute" style={{transform: `translate(${getStarPosition(11).x}px, ${getStarPosition(11).y}px) rotate(${getStarPosition(11).rotation}deg)`, opacity: 0}}></i>
                      <i className="fas fa-sparkles text-foreground dark:text-yellow-200 text-base absolute" style={{transform: `translate(${getStarPosition(12).x}px, ${getStarPosition(12).y}px) rotate(${getStarPosition(12).rotation}deg)`, opacity: 0}}></i>
                    </div>

                   {/* Центрированное число - поверх звездочек */}
                   <div className="flex flex-col items-center justify-center relative z-10">
                     <span
                       ref={numberRef}
                       className="text-2xl sm:text-3xl md:text-4xl font-bold text-green-500 transition-colors duration-500 mb-1 sm:mb-2"
                     >
                       {userCount}
                     </span>
                     <p className="text-xs sm:text-sm text-muted-foreground">
                       активных пользователей
                     </p>
                   </div>
                 </div>
               ) : null}
             </div>
           </div>
        </div>
      </div>
    </div>
  )
}
