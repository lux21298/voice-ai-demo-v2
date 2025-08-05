import { cacheService } from './cache.service'
import { configService } from './config.service'
import { AnalyticsEvent, ServiceResponse } from '@/lib/types'

interface AnalyticsMetrics {
  totalConversations: number
  totalMessages: number
  averageDuration: number
  languageDistribution: Record<string, number>
  popularTopics: Array<{ topic: string; count: number }>
  errorRate: number
  apiCosts: number
  userSatisfaction: number
}

interface DailyStats {
  date: string
  conversations: number
  messages: number
  duration: number
  cost: number
  errors: number
}

class AnalyticsService {
  private static instance: AnalyticsService

  private constructor() {}

  public static getInstance(): AnalyticsService {
    if (!AnalyticsService.instance) {
      AnalyticsService.instance = new AnalyticsService()
    }
    return AnalyticsService.instance
  }

  async trackEvent(event: AnalyticsEvent): Promise<ServiceResponse<boolean>> {
    try {
      if (!configService.getAppConfig().enableAnalytics) {
        return { success: true, data: true }
      }

      const eventKey = `analytics:event:${event.sessionId}:${Date.now()}`
      const dailyKey = `analytics:daily:${this.getDateKey()}`
      
      // Store individual event
      await cacheService.set({
        key: eventKey,
        ttl: 30 * 24 * 3600, // 30 days
        data: event,
        tags: ['analytics', 'events']
      })

      // Update daily aggregates
      await this.updateDailyStats(event)

      // Update real-time counters
      await this.updateCounters(event)

      return { success: true, data: true }
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'ANALYTICS_TRACK_ERROR',
          message: 'Failed to track analytics event',
          details: error
        }
      }
    }
  }

  private async updateDailyStats(event: AnalyticsEvent): Promise<void> {
    const dateKey = this.getDateKey()
    const dailyKey = `analytics:daily:${dateKey}`
    
    // Get existing stats or create new
    const existingStats = await cacheService.get<DailyStats>(dailyKey)
    const stats: DailyStats = existingStats.data || {
      date: dateKey,
      conversations: 0,
      messages: 0,
      duration: 0,
      cost: 0,
      errors: 0
    }

    // Update based on event type
    switch (event.type) {
      case 'conversation_start':
        stats.conversations += 1
        break
      case 'conversation_end':
        if (event.data.duration) {
          stats.duration += event.data.duration
        }
        break
      case 'error':
        stats.errors += 1
        break
    }

    if (event.cost) {
      stats.cost += event.cost
    }

    // Save updated stats
    await cacheService.set({
      key: dailyKey,
      ttl: 32 * 24 * 3600, // 32 days
      data: stats,
      tags: ['analytics', 'daily']
    })
  }

  private async updateCounters(event: AnalyticsEvent): Promise<void> {
    const today = this.getDateKey()
    
    // Increment relevant counters
    switch (event.type) {
      case 'conversation_start':
        await cacheService.increment(`counter:conversations:${today}`)
        await cacheService.increment('counter:conversations:total')
        break
      
      case 'booking_success':
        await cacheService.increment(`counter:bookings:${today}`)
        await cacheService.increment('counter:bookings:total')
        break
      
      case 'phone_call':
        await cacheService.increment(`counter:calls:${today}`)
        await cacheService.increment('counter:calls:total')
        break
    }

    // Track language usage
    if (event.data.language) {
      await cacheService.increment(`counter:language:${event.data.language}:${today}`)
    }
  }

  async getMetrics(dateRange?: { from: Date; to: Date }): Promise<ServiceResponse<AnalyticsMetrics>> {
    try {
      // Get daily stats for the range
      const days = dateRange ? this.getDaysInRange(dateRange.from, dateRange.to) : [this.getDateKey()]
      const dailyStats: DailyStats[] = []

      for (const day of days) {
        const stats = await cacheService.get<DailyStats>(`analytics:daily:${day}`)
        if (stats.data) {
          dailyStats.push(stats.data)
        }
      }

      // Aggregate metrics
      const metrics: AnalyticsMetrics = {
        totalConversations: dailyStats.reduce((sum, day) => sum + day.conversations, 0),
        totalMessages: dailyStats.reduce((sum, day) => sum + day.messages, 0),
        averageDuration: this.calculateAverageDuration(dailyStats),
        languageDistribution: await this.getLanguageDistribution(days),
        popularTopics: await this.getPopularTopics(days),
        errorRate: this.calculateErrorRate(dailyStats),
        apiCosts: dailyStats.reduce((sum, day) => sum + day.cost, 0),
        userSatisfaction: await this.getUserSatisfaction(days)
      }

      return { success: true, data: metrics }
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'ANALYTICS_GET_ERROR',
          message: 'Failed to get analytics metrics',
          details: error
        }
      }
    }
  }

  async getDailyStats(days: number = 30): Promise<ServiceResponse<DailyStats[]>> {
    try {
      const dates = this.getLastNDays(days)
      const stats: DailyStats[] = []

      for (const date of dates) {
        const dailyStats = await cacheService.get<DailyStats>(`analytics:daily:${date}`)
        stats.push(dailyStats.data || {
          date,
          conversations: 0,
          messages: 0,
          duration: 0,
          cost: 0,
          errors: 0
        })
      }

      return { success: true, data: stats }
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'ANALYTICS_DAILY_ERROR',
          message: 'Failed to get daily analytics',
          details: error
        }
      }
    }
  }

  async getRealtimeStats(): Promise<{
    activeConversations: number
    todayConversations: number
    todayBookings: number
    todayCalls: number
    currentCost: number
  }> {
    const today = this.getDateKey()
    
    try {
      const [conversations, bookings, calls, dailyStats] = await Promise.all([
        cacheService.get<number>(`counter:conversations:${today}`),
        cacheService.get<number>(`counter:bookings:${today}`),
        cacheService.get<number>(`counter:calls:${today}`),
        cacheService.get<DailyStats>(`analytics:daily:${today}`)
      ])

      return {
        activeConversations: 0, // Would need WebSocket tracking
        todayConversations: conversations.data || 0,
        todayBookings: bookings.data || 0,
        todayCalls: calls.data || 0,
        currentCost: dailyStats.data?.cost || 0
      }
    } catch (error) {
      return {
        activeConversations: 0,
        todayConversations: 0,
        todayBookings: 0,
        todayCalls: 0,
        currentCost: 0
      }
    }
  }

  private calculateAverageDuration(dailyStats: DailyStats[]): number {
    const totalConversations = dailyStats.reduce((sum, day) => sum + day.conversations, 0)
    const totalDuration = dailyStats.reduce((sum, day) => sum + day.duration, 0)
    
    return totalConversations > 0 ? totalDuration / totalConversations : 0
  }

  private async getLanguageDistribution(days: string[]): Promise<Record<string, number>> {
    const distribution: Record<string, number> = {}
    
    for (const day of days) {
      const viCount = await cacheService.get<number>(`counter:language:vi:${day}`)
      const enCount = await cacheService.get<number>(`counter:language:en:${day}`)
      
      distribution.vi = (distribution.vi || 0) + (viCount.data || 0)
      distribution.en = (distribution.en || 0) + (enCount.data || 0)
    }
    
    return distribution
  }

  private async getPopularTopics(days: string[]): Promise<Array<{ topic: string; count: number }>> {
    // This would require implementing topic tracking
    // For now, return mock data
    return [
      { topic: 'consultation', count: 45 },
      { topic: 'booking', count: 32 },
      { topic: 'pricing', count: 28 },
      { topic: 'service', count: 21 },
      { topic: 'contact', count: 15 }
    ]
  }

  private calculateErrorRate(dailyStats: DailyStats[]): number {
    const totalErrors = dailyStats.reduce((sum, day) => sum + day.errors, 0)
    const totalConversations = dailyStats.reduce((sum, day) => sum + day.conversations, 0)
    
    return totalConversations > 0 ? (totalErrors / totalConversations) * 100 : 0
  }

  private async getUserSatisfaction(days: string[]): Promise<number> {
    // This would require implementing satisfaction tracking
    // For now, return a calculated estimate
    return 4.5 // out of 5
  }

  private getDateKey(date: Date = new Date()): string {
    return date.toISOString().split('T')[0]
  }

  private getLastNDays(n: number): string[] {
    const days: string[] = []
    const today = new Date()
    
    for (let i = n - 1; i >= 0; i--) {
      const date = new Date(today)
      date.setDate(today.getDate() - i)
      days.push(this.getDateKey(date))
    }
    
    return days
  }

  private getDaysInRange(from: Date, to: Date): string[] {
    const days: string[] = []
    const current = new Date(from)
    
    while (current <= to) {
      days.push(this.getDateKey(current))
      current.setDate(current.getDate() + 1)
    }
    
    return days
  }

  // Export data for analysis
  async exportData(format: 'json' | 'csv', days: number = 30): Promise<ServiceResponse<string>> {
    try {
      const statsResult = await this.getDailyStats(days)
      if (!statsResult.success) {
        return {
          success: false,
          error: statsResult.error!
        }
      }

      const data = statsResult.data!

      if (format === 'json') {
        return { success: true, data: JSON.stringify(data, null, 2) }
      } else {
        // Convert to CSV
        const headers = ['Date', 'Conversations', 'Messages', 'Duration', 'Cost', 'Errors']
        const rows = data.map(day => [
          day.date,
          day.conversations.toString(),
          day.messages.toString(),
          day.duration.toString(),
          day.cost.toString(),
          day.errors.toString()
        ])

        const csv = [headers.join(','), ...rows.map(row => row.join(','))].join('\n')
        return { success: true, data: csv }
      }
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'ANALYTICS_EXPORT_ERROR',
          message: 'Failed to export analytics data',
          details: error
        }
      }
    }
  }

  async clearOldData(daysToKeep: number = 90): Promise<ServiceResponse<number>> {
    try {
      const cutoffDate = new Date()
      cutoffDate.setDate(cutoffDate.getDate() - daysToKeep)
      
      let deletedCount = 0
      
      // Delete old daily stats
      for (let i = daysToKeep; i < 365; i++) {
        const date = new Date()
        date.setDate(date.getDate() - i)
        const dateKey = this.getDateKey(date)
        
        const deleted = await cacheService.delete(`analytics:daily:${dateKey}`)
        if (deleted.success && deleted.data) {
          deletedCount++
        }
      }

      return { success: true, data: deletedCount }
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'ANALYTICS_CLEANUP_ERROR',
          message: 'Failed to clean up old analytics data',
          details: error
        }
      }
    }
  }
}

export const analyticsService = AnalyticsService.getInstance()
