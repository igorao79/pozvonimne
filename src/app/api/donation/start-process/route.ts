import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'

interface StartProcessRequest {
  userId: string
  sessionToken: string
  timestamp: number
}

export async function POST(request: NextRequest) {
  try {
    const { userId, sessionToken, timestamp }: StartProcessRequest = await request.json()

    if (!userId || !sessionToken) {
      return NextResponse.json({
        success: false,
        error: 'Missing required fields'
      }, { status: 400 })
    }

    const supabase = await createClient()

    // Сохраняем информацию о начале процесса покупки премиума
    const { error } = await supabase
      .from('premium_purchase_sessions')
      .insert({
        user_id: userId,
        session_token: sessionToken,
        started_at: new Date(timestamp).toISOString(),
        status: 'pending',
        expires_at: new Date(timestamp + (24 * 60 * 60 * 1000)).toISOString() // 24 часа
      })

    if (error) {
      console.error('Ошибка сохранения сессии покупки премиума:', error)
      return NextResponse.json({
        success: false,
        error: 'Failed to save session'
      }, { status: 500 })
    }

    console.log('✅ Сохранена сессия покупки премиума:', {
      userId,
      sessionToken,
      timestamp
    })

    return NextResponse.json({
      success: true,
      message: 'Purchase session started'
    })

  } catch (error) {
    console.error('Ошибка в start-process:', error)
    return NextResponse.json({
      success: false,
      error: 'Internal server error'
    }, { status: 500 })
  }
}
