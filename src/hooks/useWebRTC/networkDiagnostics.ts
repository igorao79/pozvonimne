/**
 * Диагностика сетевых проблем WebRTC
 * Помогает выявить причины "Connection failed"
 */

interface NetworkDiagnostics {
  stunReachable: boolean
  turnReachable: boolean
  networkType: string
  candidatesGathered: number
  relayCandidate: boolean
}

// Диагностика сетевого соединения для WebRTC
export const runNetworkDiagnostics = async (): Promise<NetworkDiagnostics> => {
  console.log('🔍 Запуск диагностики сети WebRTC...')
  
  const diagnostics: NetworkDiagnostics = {
    stunReachable: false,
    turnReachable: false,
    networkType: 'unknown',
    candidatesGathered: 0,
    relayCandidate: false
  }

  try {
    // Создаем временное RTCPeerConnection для диагностики
    const pc = new RTCPeerConnection({
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        {
          urls: ['turn:openrelay.metered.ca:80'],
          username: 'openrelayproject',
          credential: 'openrelayproject'
        }
      ]
    })

    // Отслеживаем ICE кандидатов
    const candidates: RTCIceCandidate[] = []
    
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        candidates.push(event.candidate)
        diagnostics.candidatesGathered++
        
        // Проверяем тип кандидата
        if (event.candidate.type === 'relay') {
          diagnostics.relayCandidate = true
          diagnostics.turnReachable = true
        }
        
        if (event.candidate.type === 'srflx') {
          diagnostics.stunReachable = true
        }

        console.log(`🔍 ICE candidate:`, {
          type: event.candidate.type,
          protocol: event.candidate.protocol,
          address: event.candidate.address,
          port: event.candidate.port
        })
      }
    }

    // Создаем фиктивный data channel для запуска ICE gathering
    pc.createDataChannel('diagnostics')
    
    // Создаем offer для начала ICE gathering
    const offer = await pc.createOffer()
    await pc.setLocalDescription(offer)

    // Ждем завершения ICE gathering (максимум 10 секунд)
    await new Promise<void>((resolve) => {
      const timeout = setTimeout(() => {
        console.log('🔍 ICE gathering timeout')
        resolve()
      }, 10000)

      pc.onicegatheringstatechange = () => {
        console.log('🔍 ICE gathering state:', pc.iceGatheringState)
        if (pc.iceGatheringState === 'complete') {
          clearTimeout(timeout)
          resolve()
        }
      }
    })

    // Определяем тип сети
    if (diagnostics.relayCandidate) {
      diagnostics.networkType = 'behind-nat-with-turn'
    } else if (diagnostics.stunReachable) {
      diagnostics.networkType = 'behind-nat-stun-only'
    } else if (diagnostics.candidatesGathered > 0) {
      diagnostics.networkType = 'direct-connection'
    } else {
      diagnostics.networkType = 'no-connectivity'
    }

    pc.close()

  } catch (error) {
    console.error('🔍 Ошибка диагностики:', error)
  }

  console.log('🔍 Результаты диагностики:', diagnostics)
  return diagnostics
}

// Получить рекомендации на основе диагностики
export const getNetworkRecommendations = (diagnostics: NetworkDiagnostics): string[] => {
  const recommendations: string[] = []

  if (!diagnostics.stunReachable && !diagnostics.turnReachable) {
    recommendations.push('⚠️ STUN и TURN серверы недоступны - проверьте настройки firewall')
    recommendations.push('🔧 Разрешите порты UDP 3478, 19302 для STUN')
    recommendations.push('🔧 Разрешите порты TCP/UDP 80, 443 для TURN')
  }

  if (!diagnostics.turnReachable && diagnostics.networkType === 'behind-nat-stun-only') {
    recommendations.push('⚠️ TURN сервер недоступен - соединение может не работать через строгий NAT')
    recommendations.push('🔧 Проверьте доступность TURN серверов')
  }

  if (diagnostics.candidatesGathered === 0) {
    recommendations.push('❌ Не удалось собрать ICE кандидатов - полная блокировка WebRTC')
    recommendations.push('🔧 Проверьте настройки антивируса и корпоративного firewall')
  }

  if (diagnostics.candidatesGathered < 2) {
    recommendations.push('⚠️ Мало ICE кандидатов - соединение может быть нестабильным')
  }

  if (recommendations.length === 0) {
    recommendations.push('✅ Сетевая конфигурация выглядит нормально')
  }

  return recommendations
}

// Запустить диагностику при проблемах соединения
export const diagnoseConnectionFailure = async (): Promise<void> => {
  console.log('🚨 Диагностика причин Connection failed...')
  
  const diagnostics = await runNetworkDiagnostics()
  const recommendations = getNetworkRecommendations(diagnostics)
  
  console.log('📋 Рекомендации по исправлению:')
  recommendations.forEach(rec => console.log(rec))
  
  return
}

