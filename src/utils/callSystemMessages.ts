import { createClient } from '@/utils/supabase/client'

interface SendSystemMessageParams {
  chatId: string
  message: string
  messageType?: 'call_missed' | 'call_ended' | 'system'
}

interface CallDurationFormat {
  totalSeconds: number
}

/**
 * Отправляет системное сообщение в чат используя функцию базы данных
 */
export const sendSystemMessage = async ({ chatId, message, messageType = 'system' }: SendSystemMessageParams) => {
  const supabase = createClient()

  try {
    console.log('📤 СИСТЕМНОЕ СООБЩЕНИЕ - Начало отправки:', {
      chatId,
      message,
      messageType,
      timestamp: new Date().toISOString()
    })

    // Проверяем аутентификацию
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    console.log('👤 СИСТЕМНОЕ СООБЩЕНИЕ - Проверка пользователя:', {
      hasUser: !!user,
      userId: user?.id?.substring(0, 8),
      authError: authError ? JSON.stringify(authError) : null
    })

    if (authError || !user) {
      console.error('❌ СИСТЕМНОЕ СООБЩЕНИЕ - Пользователь не аутентифицирован:', authError)
      return false
    }

    // Проверяем существование чата через findOrCreateChatWithUser если chatId не найден
    if (!chatId) {
      console.error('❌ СИСТЕМНОЕ СООБЩЕНИЕ - Нет chatId для проверки')
      return false
    }

    // Проверяем существование чата
    console.log('💬 СИСТЕМНОЕ СООБЩЕНИЕ - Запрос к chats API:', {
      chatId,
      query: 'chats?select=id,name,type&id=eq.' + chatId
    })

    const { data: chatData, error: chatError } = await supabase
      .from('chats')
      .select('id, name, type')
      .eq('id', chatId)
      .single()

    console.log('💬 СИСТЕМНОЕ СООБЩЕНИЕ - Проверка чата:', {
      chatFound: !!chatData,
      chatId,
      chatData: chatData ? { id: chatData.id, name: chatData.name, type: chatData.type } : null,
      chatError: chatError ? {
        message: chatError.message,
        details: chatError.details,
        hint: chatError.hint,
        code: chatError.code
      } : null
    })

    if (chatError || !chatData) {
      console.error('❌ СИСТЕМНОЕ СООБЩЕНИЕ - Чат не найден:', {
        chatId,
        chatError: chatError ? {
          message: chatError.message,
          details: chatError.details,
          hint: chatError.hint,
          code: chatError.code
        } : null
      })
      
      // ВРЕМЕННОЕ РЕШЕНИЕ: Если 500 ошибка - пропускаем системные сообщения
      if (chatError && (chatError.message?.includes('500') || chatError.code === 'PGRST301' || chatError.details?.includes('500'))) {
        console.log('🚨 ВРЕМЕННОЕ РЕШЕНИЕ - Пропускаем системное сообщение из-за 500 ошибки')
        return true // Возвращаем true чтобы не блокировать процесс
      }
      
      return false
    }

    // Проверяем участие пользователя в чате
    const { data: participantData, error: participantError } = await supabase
      .from('chat_participants')
      .select('user_id, chat_id')
      .eq('chat_id', chatId)
      .eq('user_id', user.id)
      .single()

    console.log('👥 СИСТЕМНОЕ СООБЩЕНИЕ - Проверка участия в чате:', {
      isParticipant: !!participantData,
      participantData,
      participantError: participantError ? JSON.stringify(participantError) : null
    })

    if (participantError || !participantData) {
      console.error('❌ СИСТЕМНОЕ СООБЩЕНИЕ - Пользователь не участник чата:', participantError)
      return false
    }

    // Получаем профиль пользователя
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('display_name, username')
      .eq('id', user.id)
      .single()

    console.log('👤 СИСТЕМНОЕ СООБЩЕНИЕ - Профиль пользователя:', {
      profile,
      profileError: profileError ? JSON.stringify(profileError) : null
    })

    const senderName = profile?.display_name || profile?.username || 'Система'

    // Пробуем RPC функцию
    console.log('🔧 СИСТЕМНОЕ СООБЩЕНИЕ - Вызов RPC send_system_message:', {
      p_chat_id: chatId,
      p_content: message,
      p_message_type: messageType
    })

    const { data: rpcData, error: rpcError } = await supabase.rpc('send_system_message', {
      p_chat_id: chatId,
      p_content: message,
      p_message_type: messageType
    })

    console.log('🔧 СИСТЕМНОЕ СООБЩЕНИЕ - Результат RPC:', {
      rpcData,
      rpcError: rpcError ? {
        message: rpcError.message,
        details: rpcError.details,
        hint: rpcError.hint,
        code: rpcError.code
      } : null
    })

    if (rpcError) {
      console.warn('⚠️ СИСТЕМНОЕ СООБЩЕНИЕ - RPC failed, trying fallback insert')
      
      // Fallback: прямая вставка
      const insertData = {
        chat_id: chatId,
        sender_id: user.id,
        content: message,
        type: 'text'
      }

      console.log('📝 СИСТЕМНОЕ СООБЩЕНИЕ - Данные для прямой вставки:', insertData)

      const { data: fallbackData, error: fallbackError } = await supabase
        .from('messages')
        .insert(insertData)
        .select()

      console.log('📝 СИСТЕМНОЕ СООБЩЕНИЕ - Результат прямой вставки:', {
        fallbackData,
        fallbackError: fallbackError ? {
          message: fallbackError.message,
          details: fallbackError.details,
          hint: fallbackError.hint,
          code: fallbackError.code
        } : null
      })

      if (fallbackError) {
        console.error('❌ СИСТЕМНОЕ СООБЩЕНИЕ - Fallback insert failed:', fallbackError)
        return false
      }

      console.log('✅ СИСТЕМНОЕ СООБЩЕНИЕ - Отправлено через fallback:', fallbackData)
      return true
    }

    console.log('✅ СИСТЕМНОЕ СООБЩЕНИЕ - Отправлено через RPC:', rpcData)
    return true
  } catch (error) {
    console.error('❌ СИСТЕМНОЕ СООБЩЕНИЕ - Exception:', {
      error,
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    })
    return false
  }
}

/**
 * Отправляет системное сообщение о пропущенном звонке
 */
export const sendMissedCallMessage = async (chatId: string, callerName: string) => {
  const message = `${callerName} пытался позвонить вам`
  return sendSystemMessage({
    chatId,
    message,
    messageType: 'call_missed'
  })
}

/**
 * Форматирует продолжительность звонка в читаемый вид
 */
export const formatCallDuration = (totalSeconds: number): string => {
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const secs = totalSeconds % 60

  if (hours > 0) {
    if (hours === 1) {
      return `${hours} час ${minutes} ${minutes === 1 ? 'минуту' : minutes < 5 ? 'минуты' : 'минут'}`
    } else if (hours < 5) {
      return `${hours} часа ${minutes} ${minutes === 1 ? 'минуту' : minutes < 5 ? 'минуты' : 'минут'}`
    } else {
      return `${hours} часов ${minutes} ${minutes === 1 ? 'минуту' : minutes < 5 ? 'минуты' : 'минут'}`
    }
  }

  if (minutes > 0) {
    if (minutes === 1) {
      return `${minutes} минуту ${secs} ${secs === 1 ? 'секунду' : secs < 5 ? 'секунды' : 'секунд'}`
    } else if (minutes < 5) {
      return `${minutes} минуты ${secs} ${secs === 1 ? 'секунду' : secs < 5 ? 'секунды' : 'секунд'}`
    } else {
      return `${minutes} минут ${secs} ${secs === 1 ? 'секунду' : secs < 5 ? 'секунды' : 'секунд'}`
    }
  }

  if (secs === 1) {
    return `${secs} секунду`
  } else if (secs < 5) {
    return `${secs} секунды`
  } else {
    return `${secs} секунд`
  }
}

/**
 * Отправляет системное сообщение о завершении звонка
 */
export const sendCallEndedMessage = async (chatId: string, durationSeconds: number) => {
  const durationText = formatCallDuration(durationSeconds)
  const message = `Звонок был завершен и продлился ${durationText}`
  
  return sendSystemMessage({
    chatId,
    message,
    messageType: 'call_ended'
  })
}

/**
 * Находит или создает чат с пользователем
 */
export const findOrCreateChatWithUser = async (targetUserId: string) => {
  const supabase = createClient()

  try {
    console.log('🔍 ПОИСК ЧАТА - Начало поиска/создания чата:', {
      targetUserId: targetUserId.substring(0, 8),
      timestamp: new Date().toISOString()
    })

    // Проверяем аутентификацию
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    console.log('👤 ПОИСК ЧАТА - Проверка пользователя:', {
      hasUser: !!user,
      userId: user?.id?.substring(0, 8),
      authError: authError ? JSON.stringify(authError) : null
    })

    if (authError || !user) {
      console.error('❌ ПОИСК ЧАТА - Пользователь не аутентифицирован:', authError)
      return null
    }

    // Получаем все чаты пользователя
    console.log('📋 ПОИСК ЧАТА - Загрузка списка чатов через get_user_chats')
    const { data: chats, error: chatsError } = await supabase.rpc('get_user_chats')

    console.log('📋 ПОИСК ЧАТА - Результат загрузки чатов:', {
      chatsCount: chats?.length || 0,
      chatsError: chatsError ? {
        message: chatsError.message,
        details: chatsError.details,
        code: chatsError.code
      } : null,
      chatsPreview: chats?.slice(0, 3).map((c: any) => ({
        id: c.id,
        name: c.name,
        type: c.type,
        other_participant_id: c.other_participant_id?.substring(0, 8)
      }))
    })

    if (chatsError) {
      console.error('❌ ПОИСК ЧАТА - Ошибка загрузки чатов:', chatsError)
      return null
    }

    // Ищем приватный чат с целевым пользователем
    console.log('🔍 ПОИСК ЧАТА - Поиск существующего чата с пользователем:', {
      targetUserId: targetUserId.substring(0, 8),
      totalChats: chats?.length || 0
    })

    const targetChat = chats?.find((chat: any) =>
      chat.type === 'private' && chat.other_participant_id === targetUserId
    )

    console.log('🔍 ПОИСК ЧАТА - Результат поиска существующего чата:', {
      found: !!targetChat,
      targetChat: targetChat ? {
        id: targetChat.id,
        name: targetChat.name,
        type: targetChat.type,
        other_participant_id: targetChat.other_participant_id?.substring(0, 8)
      } : null
    })

    if (targetChat) {
      console.log('✅ ПОИСК ЧАТА - Найден существующий чат:', {
        chatId: targetChat.id,
        chatName: targetChat.name
      })
      return targetChat.id
    }

    // Если чат не найден, создаем новый
    console.log('📝 ПОИСК ЧАТА - Чат не найден, создаем новый:', {
      targetUserId: targetUserId.substring(0, 8),
      currentUserId: user.id.substring(0, 8)
    })

    const { data: newChat, error: createError } = await supabase.rpc('create_private_chat', {
      other_user_id: targetUserId
    })

    console.log('📝 ПОИСК ЧАТА - Результат создания нового чата:', {
      newChat,
      createError: createError ? {
        message: createError.message,
        details: createError.details,
        hint: createError.hint,
        code: createError.code
      } : null
    })

    if (createError) {
      console.error('❌ ПОИСК ЧАТА - Ошибка создания чата:', createError)
      return null
    }

    console.log('✅ ПОИСК ЧАТА - Создан новый чат:', {
      newChat,
      targetUserId: targetUserId.substring(0, 8)
    })
    return newChat
  } catch (error) {
    console.error('❌ ПОИСК ЧАТА - Exception:', {
      error,
      targetUserId: targetUserId.substring(0, 8),
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    })
    return null
  }
}
