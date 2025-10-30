import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'

interface DonationWebhookPayload {
  id: number
  name: string
  username: string
  message: string
  amount: number
  currency: string
  is_shown: number
  created_at: string
  shown_at: string | null
}

interface WebhookLogData {
  processed_at: string
  status: 'success' | 'error' | 'duplicate'
  error_message?: string
  user_id?: string
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  let webhookLogId: string | null = null

  try {
    const payload: DonationWebhookPayload = await request.json()
    console.log('🔗 Webhook получен:', payload)

    // Проверка заголовков
    const signature = request.headers.get('X-Signature')
    const userAgent = request.headers.get('User-Agent')
    console.log('🔍 Заголовки webhook:', { signature: signature ? 'present' : 'missing', userAgent })

    // Проверка дубликатов
    const { data: existingWebhook } = await supabase
      .from('donation_webhooks')
      .select('id, status, processed_at')
      .eq('donation_id', payload.id)
      .single()

    if (existingWebhook) {
      console.log('⚠️ Дубликат webhook найден:', existingWebhook)
      return NextResponse.json({
        received: true,
        message: 'Webhook уже обработан',
        duplicate: true,
        previous_status: existingWebhook.status
      })
    }

    // Логирование webhook
    const { data: logEntry, error: logError } = await supabase
      .from('donation_webhooks')
      .insert({
        donation_id: payload.id,
        payload,
        processed_at: new Date().toISOString(),
        status: 'processing'
      })
      .select('id')
      .single()

    if (logError) console.error('❌ Ошибка логирования webhook:', logError)
    else webhookLogId = logEntry?.id

    // Проверка суммы и валюты
    if (payload.amount < 10 || payload.currency !== 'RUB') {
      console.log('❌ Донат не подходит для активации премиума:', payload.amount, payload.currency)
      return NextResponse.json({ received: true })
    }

    // Проверка ключевого слова в сообщении
    const message = payload.message.toLowerCase().trim()
    if (!message.includes('премиум')) {
      console.log('❌ В сообщении нет слова "премиум":', payload.message)
      return NextResponse.json({ received: true })
    }

    console.log('✅ Донация прошла проверки:', payload.amount, payload.currency, payload.message)

    // Поиск пользователя
    let userId: string | null = null
    let searchMethod = ''

    // 1️⃣ Поиск через активные сессии премиума
    const donationTime = new Date(payload.created_at)
    const searchWindowStart = new Date(donationTime.getTime() - 3600000)
    const searchWindowEnd = new Date(donationTime.getTime() + 3600000)

    const { data: activeSessions, error: sessionError } = await supabase
      .from('premium_purchase_sessions')
      .select('user_id, session_token, started_at')
      .eq('status', 'pending')
      .gte('started_at', searchWindowStart.toISOString())
      .lte('started_at', searchWindowEnd.toISOString())
      .order('started_at', { ascending: false })

    if (sessionError) console.error('❌ Ошибка поиска сессий:', sessionError)
    else if (activeSessions?.length) {
      const closestSession =
        activeSessions.length === 1
          ? activeSessions[0]
          : activeSessions.reduce((prev, curr) => {
              return Math.abs(new Date(curr.started_at).getTime() - donationTime.getTime()) <
                Math.abs(new Date(prev.started_at).getTime() - donationTime.getTime())
                ? curr
                : prev
            })
      userId = closestSession.user_id
      searchMethod = activeSessions.length === 1 ? 'premium_session_single' : 'premium_session_closest'

      await supabase
        .from('premium_purchase_sessions')
        .update({
          status: 'completed',
          donation_id: payload.id,
          completed_at: new Date().toISOString()
        })
        .eq('user_id', userId)
    }

    // 2️⃣ Fallback методы поиска пользователя
    if (!userId) {
      // По email
      if (payload.username.includes('@')) {
        const { data: users, error: authError } = await supabase.auth.admin.listUsers()
        if (!authError) {
          const user = users.users?.find(u => u.email?.toLowerCase() === payload.username.toLowerCase())
          if (user) { userId = user.id; searchMethod = 'email_in_auth' }
        }
      }

      // По точному или нечеткому совпадению display_name / username
      if (!userId) {
        const { data: exactProfiles } = await supabase
          .from('user_profiles')
          .select('id, username, display_name')
          .or(`display_name.eq.${payload.username},username.eq.${payload.username}`)
        if (exactProfiles?.length) { userId = exactProfiles[0].id; searchMethod = 'exact_match_profiles' }
        else {
          const { data: fuzzyProfiles } = await supabase
            .from('user_profiles')
            .select('id, username, display_name')
            .or(`display_name.ilike.%${payload.username}%,username.ilike.%${payload.username}%`)
          if (fuzzyProfiles?.length) { userId = fuzzyProfiles[0].id; searchMethod = 'fuzzy_match_profiles' }
        }
      }
    }

    // 3️⃣ Если пользователь не найден
    if (!userId) {
      if (webhookLogId) {
        await supabase
          .from('donation_webhooks')
          .update({ status: 'error', error_message: 'USER_NOT_FOUND' })
          .eq('id', webhookLogId)
      }
      return NextResponse.json({
        received: true,
        message: 'Пользователь не найден',
        error: 'USER_NOT_FOUND'
      })
    }

    // Проверка текущего статуса премиума
    const { data: currentProfile, error: checkError } = await supabase
      .from('user_profiles')
      .select('is_premium, premium_activated_at')
      .eq('id', userId)
      .single()

    if (checkError) return NextResponse.json({ received: true, error: 'Ошибка проверки статуса' })
    if (currentProfile?.is_premium)
      return NextResponse.json({ received: true, message: 'Премиум уже активирован', user_id: userId })

    // Активация премиума
    const activationTime = new Date().toISOString()
    await supabase.from('user_profiles').update({
      is_premium: true,
      premium_activated_at: activationTime,
      premium_color: '#FFD700',
      premium_icon: '',
      premium_icon_color_match: false
    }).eq('id', userId)

    if (webhookLogId) await supabase.from('donation_webhooks').update({ status: 'success', user_id: userId }).eq('id', webhookLogId)

    // Отправка уведомления пользователю
    try {
      await supabase.rpc('send_message', {
        chat_uuid: userId,
        message_content: '🎉 Ваш премиум статус активирован!',
        message_type: 'system',
        reply_to_uuid: null,
        metadata: { system: true, premium_activated: true }
      })
    } catch (notificationError) {
      console.warn('⚠️ Не удалось отправить уведомление:', notificationError)
    }

    return NextResponse.json({
      received: true,
      message: 'Премиум статус успешно активирован',
      user_id: userId,
      activated_at: activationTime,
      search_method: searchMethod,
      donation_details: { id: payload.id, amount: payload.amount, message: payload.message }
    })
  } catch (error) {
    console.error('❌ Критическая ошибка webhook:', error)
    if (webhookLogId) {
      await supabase.from('donation_webhooks').update({
        status: 'error',
        error_message: error instanceof Error ? error.message : 'Unknown error'
      }).eq('id', webhookLogId)
    }
    return NextResponse.json({ received: true, error: 'Внутренняя ошибка сервера', error_details: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 })
  }
}
