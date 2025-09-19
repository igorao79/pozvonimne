'use client'

/**
 * Утилиты для надежной отправки сигналов звонков
 * Обеспечивает 100% доставку сигналов через устойчивые каналы
 */

import { createClient } from '@/utils/supabase/client'
import { resilientChannelManager } from '@/utils/resilientChannelManager'

interface SendCallSignalParams {
  targetUserId: string
  callerUserId: string
  callerName: string
  event: 'incoming_call' | 'call_accepted' | 'call_rejected' | 'call_ended' | 'call_cancelled'
  extraPayload?: Record<string, any>
}

/**
 * Надежная отправка сигнала звонка через прямой канал Supabase
 */
export const sendCallSignal = async ({
  targetUserId,
  callerUserId,
  callerName,
  event,
  extraPayload = {}
}: SendCallSignalParams): Promise<boolean> => {
  console.log(`📡 CallSignaling: Sending ${event} signal to user:`, targetUserId.slice(0, 8))
  
  const supabase = createClient()
  
  let signalSent = false
  let attempts = 0
  const maxAttempts = 3
  
  while (!signalSent && attempts < maxAttempts) {
    attempts++
    console.log(`📡 CallSignaling: Attempt ${attempts}/${maxAttempts} to send ${event}`)
    
    try {
      // Создаем канал для отправки в канал получателя
      const receiverChannelId = `calls:${targetUserId}`
      
      // Отправляем сигнал напрямую через Supabase broadcast
      const payload = {
        caller_id: callerUserId,
        caller_name: callerName,
        timestamp: Date.now(),
        ...extraPayload
      }
      
      console.log(`📡 CallSignaling: Sending ${event} with payload:`, {
        ...payload,
        caller_id: payload.caller_id?.slice(0, 8),
        to_channel: receiverChannelId
      })
      
      // Отправляем сигнал напрямую на канал получателя
      // Используем существующий канал из resilientChannelManager, если он есть
      const existingChannel = resilientChannelManager.getChannel(receiverChannelId)
      let channel: any

      if (existingChannel && existingChannel.state === 'joined') {
        console.log(`📡 CallSignaling: Using existing channel for ${event}`)
        channel = existingChannel
      } else {
        console.log(`📡 CallSignaling: Creating new channel for ${event}`)
        channel = supabase.channel(receiverChannelId)

        // Быстрая подписка для надежности
        await new Promise<void>((resolve) => {
          const timeout = setTimeout(() => {
            console.log(`📡 CallSignaling: Channel subscription timeout for ${event}, continuing...`)
            resolve()
          }, 500)

          channel.subscribe((status: any) => {
            clearTimeout(timeout)
            console.log(`📡 CallSignaling: Channel subscription status for ${event}:`, status)
            resolve()
          })
        })
      }

      const result = await channel.send({
        type: 'broadcast',
        event,
        payload
      })

      console.log(`📡 CallSignaling: ${event} signal result:`, result)
      
      if (result === 'ok') {
        signalSent = true
        console.log(`✅ CallSignaling: ${event} signal sent successfully`)
      } else {
        throw new Error(`Send failed with result: ${result}`)
      }
      
    } catch (error) {
      console.warn(`❌ CallSignaling: ${event} signal attempt ${attempts} failed:`, error)
      
      if (attempts < maxAttempts) {
        console.log(`🔄 CallSignaling: Retrying ${event} signal...`)
        await new Promise(resolve => setTimeout(resolve, 200)) // Быстрая повторная попытка - 200ms
      }
    }
  }
  
  if (!signalSent) {
    console.error(`💥 CallSignaling: Failed to send ${event} signal after all attempts`)
    return false
  }
  
  return true
}

/**
 * Отправка сигнала входящего звонка
 */
export const sendIncomingCallSignal = async (
  targetUserId: string,
  callerUserId: string,
  callerName: string
): Promise<boolean> => {
  console.log(`📡 CallSignaling: 📞 Sending INCOMING_CALL signal to ${targetUserId.slice(0, 8)} from ${callerUserId.slice(0, 8)}`)
  return sendCallSignal({
    targetUserId,
    callerUserId,
    callerName,
    event: 'incoming_call'
  })
}

/**
 * Отправка сигнала принятия звонка
 */
export const sendCallAcceptedSignal = async (
  callerUserId: string,
  accepterUserId: string,
  accepterName: string
): Promise<boolean> => {
  return sendCallSignal({
    targetUserId: callerUserId,
    callerUserId: accepterUserId,
    callerName: accepterName,
    event: 'call_accepted',
    extraPayload: { accepter_id: accepterUserId }
  })
}

/**
 * Отправка сигнала отклонения звонка
 */
export const sendCallRejectedSignal = async (
  callerUserId: string,
  rejecterUserId: string,
  rejecterName: string
): Promise<boolean> => {
  return sendCallSignal({
    targetUserId: callerUserId,
    callerUserId: rejecterUserId,
    callerName: rejecterName,
    event: 'call_rejected',
    extraPayload: { rejector_id: rejecterUserId }
  })
}

/**
 * Отправка сигнала завершения звонка
 */
export const sendCallEndedSignal = async (
  targetUserId: string,
  senderUserId: string,
  senderName: string
): Promise<boolean> => {
  return sendCallSignal({
    targetUserId,
    callerUserId: senderUserId,
    callerName: senderName,
    event: 'call_ended'
  })
}

/**
 * Отправка сигнала отмены звонка
 */
export const sendCallCancelledSignal = async (
  targetUserId: string,
  callerUserId: string,
  callerName: string
): Promise<boolean> => {
  console.log(`📡 CallSignaling: 📞 Sending CALL_CANCELLED signal to ${targetUserId.slice(0, 8)} from ${callerUserId.slice(0, 8)}`)
  return sendCallSignal({
    targetUserId,
    callerUserId,
    callerName,
    event: 'call_cancelled'
  })
}
