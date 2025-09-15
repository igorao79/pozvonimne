import React, { useState, useEffect } from 'react'
import { createClient } from '@/utils/supabase/client'

const RealtimeTest = () => {
  const [logs, setLogs] = useState<string[]>([])
  const [isConnected, setIsConnected] = useState(false)
  const supabase = createClient()

  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString()
    setLogs(prev => [...prev, `[${timestamp}] ${message}`])
  }

  useEffect(() => {
    addLog('🧪 Запуск теста realtime...')

    // Тестируем основное подключение
    const testChannel = supabase
      .channel('realtime_test')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'messages'
      }, (payload) => {
        addLog(`📡 Получено изменение: ${JSON.stringify(payload)}`)
      })
      .subscribe((status) => {
        addLog(`📡 Статус канала: ${status}`)
        setIsConnected(status === 'SUBSCRIBED')
      })

    return () => {
      addLog('🧹 Очистка тестового канала')
      supabase.removeChannel(testChannel)
    }
  }, [])

  const testInsert = async () => {
    try {
      addLog('📝 Попытка вставить тестовое сообщение...')

      // Найдем существующий чат
      const { data: chats, error: chatError } = await supabase
        .from('chats')
        .select('id')
        .limit(1)

      if (chatError || !chats || chats.length === 0) {
        addLog(`❌ Ошибка получения чата: ${chatError?.message}`)
        return
      }

      const chatId = chats[0].id
      addLog(`📋 Используем чат: ${chatId}`)

      // Получим текущего пользователя
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        addLog('❌ Пользователь не авторизован')
        return
      }

      // Вставим тестовое сообщение
      const { data, error } = await supabase
        .from('messages')
        .insert({
          chat_id: chatId,
          sender_id: user.id,
          content: `Тестовое сообщение ${new Date().toLocaleTimeString()}`,
          type: 'text',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()

      if (error) {
        addLog(`❌ Ошибка вставки: ${error.message}`)
      } else {
        addLog(`✅ Сообщение вставлено: ${data?.[0]?.id}`)
      }
    } catch (err) {
      addLog(`❌ Ошибка: ${err}`)
    }
  }

  const clearLogs = () => {
    setLogs([])
  }

  return (
    <div className="fixed bottom-4 right-4 bg-white border border-gray-300 rounded-lg shadow-lg p-4 max-w-md max-h-96 overflow-auto">
      <div className="flex items-center justify-between mb-2">
        <h3 className="font-semibold text-sm">
          🧪 Realtime Test
          <span className={`ml-2 px-2 py-1 rounded text-xs ${isConnected ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
            {isConnected ? 'Подключен' : 'Отключен'}
          </span>
        </h3>
        <button
          onClick={clearLogs}
          className="text-xs text-gray-500 hover:text-gray-700"
        >
          Очистить
        </button>
      </div>

      <button
        onClick={testInsert}
        className="mb-2 px-3 py-1 bg-blue-500 text-white text-xs rounded hover:bg-blue-600"
      >
        Тестовое сообщение
      </button>

      <div className="space-y-1 text-xs font-mono">
        {logs.slice(-10).map((log, index) => (
          <div key={index} className="text-gray-600">
            {log}
          </div>
        ))}
      </div>

      {logs.length > 10 && (
        <div className="text-xs text-gray-400 mt-2">
          ... и ещё {logs.length - 10} сообщений
        </div>
      )}
    </div>
  )
}

export default RealtimeTest
