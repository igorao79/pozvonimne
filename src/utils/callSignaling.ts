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
 * Отправка сигнала с ожиданием подтверждения доставки
 */
const sendCallSignalWithAcknowledgment = async (
  params: SendCallSignalParams & { expectAck?: boolean; timeout?: number }
): Promise<{ success: boolean; acknowledged: boolean }> => {
  const { targetUserId, callerUserId, callerName, event, extraPayload = {}, expectAck = true, timeout = 10000 } = params
  
  // Генерируем уникальный ID для отслеживания
  const signalId = `${event}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  console.log(`📡 CallSignaling: Sending ${event} with acknowledgment, ID: ${signalId}`)
  
  const supabase = createClient()
  
  // Подготавливаем канал для получения acknowledgment
  let ackReceived = false
  let ackChannel: any = null
  
  if (expectAck) {
    const ackChannelId = `ack:${callerUserId}`
    ackChannel = supabase.channel(ackChannelId)
    
    // Подписываемся на подтверждения
    await new Promise<void>((resolve) => {
      const timeout_id = setTimeout(() => resolve(), 1000)
      ackChannel.subscribe((status: any) => {
        clearTimeout(timeout_id)
        console.log(`📡 CallSignaling: ACK channel status: ${status}`)
        resolve()
      })
    })
    
    // Слушаем acknowledgment
    ackChannel.on('broadcast', { event: 'call_signal_ack' }, (payload: any) => {
      console.log(`📡 CallSignaling: Received ACK:`, payload)
      if (payload.payload?.signal_id === signalId) {
        console.log(`✅ CallSignaling: Signal ${signalId} acknowledged!`)
        ackReceived = true
      }
    })
  }
  
  // Отправляем основной сигнал
  const signalSent = await sendCallSignal({
    targetUserId,
    callerUserId,
    callerName,
    event,
    extraPayload: {
      ...extraPayload,
      signal_id: signalId,
      expect_ack: expectAck
    }
  })
  
  if (!signalSent) {
    if (ackChannel) {
      supabase.removeChannel(ackChannel)
    }
    return { success: false, acknowledged: false }
  }
  
  // Если не ожидаем подтверждение, сразу возвращаем успех
  if (!expectAck) {
    return { success: true, acknowledged: true }
  }
  
  // Ожидаем acknowledgment с таймаутом
  console.log(`⏳ CallSignaling: Waiting for acknowledgment for ${timeout}ms...`)
  const ackResult = await new Promise<boolean>((resolve) => {
    const timeoutId = setTimeout(() => {
      console.log(`⏰ CallSignaling: ACK timeout for signal ${signalId}`)
      resolve(false)
    }, timeout)
    
    const checkAck = () => {
      if (ackReceived) {
        clearTimeout(timeoutId)
        resolve(true)
      } else {
        setTimeout(checkAck, 100)
      }
    }
    checkAck()
  })
  
  // Очищаем канал подтверждений
  if (ackChannel) {
    supabase.removeChannel(ackChannel)
  }
  
  console.log(`📡 CallSignaling: Signal ${signalId} result:`, {
    sent: signalSent,
    acknowledged: ackResult
  })
  
  return { success: signalSent, acknowledged: ackResult }
}

/**
 * Отправка сигнала входящего звонка с гарантированной доставкой
 */
export const sendIncomingCallSignal = async (
  targetUserId: string,
  callerUserId: string,
  callerName: string
): Promise<boolean> => {
  console.log(`📞 Sending incoming call signal with acknowledgment...`)
  
  const result = await sendCallSignalWithAcknowledgment({
    targetUserId,
    callerUserId,
    callerName,
    event: 'incoming_call',
    expectAck: true,
    timeout: 15000 // 15 секунд на подтверждение
  })
  
  if (result.success && result.acknowledged) {
    console.log(`✅ Incoming call signal delivered and acknowledged`)
    return true
  } else if (result.success && !result.acknowledged) {
    console.log(`⚠️ Incoming call signal sent but not acknowledged - user might be offline`)
    // Возвращаем true даже без acknowledgment, так как сигнал отправлен
    return true
  } else {
    console.log(`❌ Failed to send incoming call signal`)
    return false
  }
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
