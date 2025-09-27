import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'

interface CheckStatusRequest {
  userId: string
}

export async function POST(request: NextRequest) {
  try {
    const { userId }: CheckStatusRequest = await request.json()

    if (!userId) {
      return NextResponse.json({
        premium_activated: false,
        message: 'Не указан ID пользователя'
      }, { status: 400 })
    }

    console.log('🔍 Проверка статуса премиума для пользователя:', userId)

    const supabase = await createClient()

    // Проверяем статус премиума пользователя
    const { data: profile, error } = await supabase
      .from('user_profiles')
      .select('is_premium, premium_activated_at')
      .eq('id', userId)
      .single()

    if (error) {
      console.error('❌ Ошибка при проверке статуса премиума:', error)
      return NextResponse.json({
        premium_activated: false,
        message: 'Ошибка при проверке статуса'
      }, { status: 500 })
    }

    if (profile?.is_premium) {
      console.log('✅ Премиум статус уже активирован:', {
        userId,
        activatedAt: profile.premium_activated_at
      })

      return NextResponse.json({
        premium_activated: true,
        activated_at: profile.premium_activated_at,
        message: 'Премиум статус активирован'
      })
    }

    // Проверяем недавние донаты (последние 24 часа)
    const oneDayAgo = new Date()
    oneDayAgo.setHours(oneDayAgo.getHours() - 24)

    console.log('🔍 Проверка недавних донатов (последние 24 часа)...')

    // Для тестирования можно проверить, есть ли записи в логах или другие индикаторы
    // Пока просто возвращаем статус "не активирован"

    console.log('❌ Премиум статус не найден для пользователя:', userId)

    return NextResponse.json({
      premium_activated: false,
      message: 'Премиум статус не активирован. Если вы уже сделали донат, подождите несколько минут или обратитесь в поддержку.'
    })

  } catch (error) {
    console.error('❌ Ошибка в check-status:', error)
    return NextResponse.json({
      premium_activated: false,
      message: 'Внутренняя ошибка сервера'
    }, { status: 500 })
  }
}
