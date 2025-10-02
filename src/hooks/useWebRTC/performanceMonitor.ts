// Мониторинг производительности WebRTC для выявления проблем со временем

interface PerformanceMetrics {
  connectionAttempts: number
  successfulConnections: number
  failedConnections: number
  reconnectionAttempts: number
  avgConnectionTime: number
  peakMemoryUsage: number
  activeResourcesCount: number
  lastCleanupTime: number
}

class WebRTCPerformanceMonitor {
  private static instance: WebRTCPerformanceMonitor
  private metrics: PerformanceMetrics = {
    connectionAttempts: 0,
    successfulConnections: 0,
    failedConnections: 0,
    reconnectionAttempts: 0,
    avgConnectionTime: 0,
    peakMemoryUsage: 0,
    activeResourcesCount: 0,
    lastCleanupTime: Date.now()
  }

  private connectionStartTimes: Map<string, number> = new Map()
  private performanceIntervalId: NodeJS.Timeout | null = null

  private constructor() {
    this.startPerformanceMonitoring()
  }

  static getInstance(): WebRTCPerformanceMonitor {
    if (!WebRTCPerformanceMonitor.instance) {
      WebRTCPerformanceMonitor.instance = new WebRTCPerformanceMonitor()
    }
    return WebRTCPerformanceMonitor.instance
  }

  // Регистрация начала попытки соединения
  recordConnectionAttempt(userId: string): void {
    this.metrics.connectionAttempts++
    this.connectionStartTimes.set(userId, Date.now())
    console.log(`📊 Performance: Connection attempt #${this.metrics.connectionAttempts} for user ${userId?.slice(0, 8)}`)
  }

  // Регистрация успешного соединения
  recordConnectionSuccess(userId: string): void {
    this.metrics.successfulConnections++
    
    const startTime = this.connectionStartTimes.get(userId)
    if (startTime) {
      const connectionTime = Date.now() - startTime
      this.metrics.avgConnectionTime = (this.metrics.avgConnectionTime + connectionTime) / 2
      this.connectionStartTimes.delete(userId)
      
      console.log(`✅ Performance: Successful connection for user ${userId?.slice(0, 8)} in ${connectionTime}ms`)
    }

    this.checkPerformanceHealth()
  }

  // Регистрация неудачного соединения
  recordConnectionFailure(userId: string, reason?: string): void {
    this.metrics.failedConnections++
    this.connectionStartTimes.delete(userId)
    
    console.log(`❌ Performance: Failed connection for user ${userId?.slice(0, 8)}, reason: ${reason}`)
    this.checkPerformanceHealth()
  }

  // Регистрация попытки переподключения
  recordReconnectionAttempt(userId: string): void {
    this.metrics.reconnectionAttempts++
    console.log(`🔄 Performance: Reconnection attempt #${this.metrics.reconnectionAttempts} for user ${userId?.slice(0, 8)}`)
  }

  // Регистрация очистки ресурсов
  recordResourceCleanup(resourceCount: number): void {
    this.metrics.activeResourcesCount = Math.max(0, this.metrics.activeResourcesCount - resourceCount)
    this.metrics.lastCleanupTime = Date.now()
    console.log(`🧹 Performance: Cleaned up ${resourceCount} resources, active: ${this.metrics.activeResourcesCount}`)
  }

  // Регистрация создания новых ресурсов
  recordResourceCreation(resourceCount: number = 1): void {
    this.metrics.activeResourcesCount += resourceCount
  }

  // Проверка состояния производительности
  private checkPerformanceHealth(): void {
    const failureRate = this.metrics.failedConnections / Math.max(1, this.metrics.connectionAttempts)
    const timeSinceLastCleanup = Date.now() - this.metrics.lastCleanupTime

    // Предупреждения о производительности (только если есть реальные попытки)
    if (this.metrics.connectionAttempts > 0 && failureRate > 0.5) {
      console.warn(`⚠️ Performance Warning: High failure rate (${(failureRate * 100).toFixed(1)}%)`)
    }

    if (this.metrics.activeResourcesCount > 10) {
      console.warn(`⚠️ Performance Warning: Too many active resources (${this.metrics.activeResourcesCount})`)
    }

    if (timeSinceLastCleanup > 300000) { // 5 минут
      console.warn(`⚠️ Performance Warning: No cleanup for ${Math.round(timeSinceLastCleanup / 1000)}s`)
    }

    if (this.metrics.avgConnectionTime > 10000) { // 10 секунд
      console.warn(`⚠️ Performance Warning: Slow connections (${this.metrics.avgConnectionTime}ms avg)`)
    }
  }

  // Автоматический мониторинг производительности
  private startPerformanceMonitoring(): void {
    this.performanceIntervalId = setInterval(() => {
      this.checkPerformanceHealth()
      
      // Периодический вывод статистики
      if (this.metrics.connectionAttempts > 0) {
        console.log('📊 WebRTC Performance Stats:', this.getMetrics())
      }

      // Автоматическая очистка старых записей времени соединения
      const now = Date.now()
      for (const [userId, startTime] of this.connectionStartTimes) {
        if (now - startTime > 30000) { // 30 секунд timeout
          console.warn(`⏱️ Performance: Removing stale connection record for ${userId?.slice(0, 8)}`)
          this.connectionStartTimes.delete(userId)
          this.recordConnectionFailure(userId, 'timeout')
        }
      }
    }, 60000) // Каждую минуту
  }

  // Получение метрик
  getMetrics(): PerformanceMetrics {
    return { ...this.metrics }
  }

  // Получение детальной статистики
  getDetailedStats() {
    const failureRate = this.metrics.failedConnections / Math.max(1, this.metrics.connectionAttempts)
    const successRate = this.metrics.successfulConnections / Math.max(1, this.metrics.connectionAttempts)
    
    return {
      ...this.metrics,
      failureRate: parseFloat((failureRate * 100).toFixed(1)),
      successRate: parseFloat((successRate * 100).toFixed(1)),
      pendingConnections: this.connectionStartTimes.size,
      timeSinceLastCleanup: Date.now() - this.metrics.lastCleanupTime
    }
  }

  // Сброс метрик
  resetMetrics(): void {
    this.metrics = {
      connectionAttempts: 0,
      successfulConnections: 0,
      failedConnections: 0,
      reconnectionAttempts: 0,
      avgConnectionTime: 0,
      peakMemoryUsage: 0,
      activeResourcesCount: 0,
      lastCleanupTime: Date.now()
    }
    this.connectionStartTimes.clear()
    console.log('📊 Performance metrics reset')
  }

  // Остановка мониторинга
  stopMonitoring(): void {
    if (this.performanceIntervalId) {
      clearInterval(this.performanceIntervalId)
      this.performanceIntervalId = null
    }
  }
}

export const performanceMonitor = WebRTCPerformanceMonitor.getInstance()

// Очистка при размонтировании страницы
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    performanceMonitor.stopMonitoring()
  })
}
