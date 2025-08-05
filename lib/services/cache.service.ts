import { Redis } from '@upstash/redis'
import { configService } from './config.service'
import { CacheStrategy, ServiceResponse } from '@/lib/types'

class CacheService {
  private static instance: CacheService
  private redis: Redis

  private constructor() {
    const redisConfig = configService.getRedisConfig()
    this.redis = new Redis({
      url: redisConfig.url,
      token: redisConfig.token
    })
  }

  public static getInstance(): CacheService {
    if (!CacheService.instance) {
      CacheService.instance = new CacheService()
    }
    return CacheService.instance
  }

  async set(strategy: CacheStrategy): Promise<ServiceResponse<boolean>> {
    try {
      await this.redis.setex(strategy.key, strategy.ttl, JSON.stringify(strategy.data))
      
      // Set tags for cache invalidation
      if (strategy.tags) {
        for (const tag of strategy.tags) {
          await this.redis.sadd(`tag:${tag}`, strategy.key)
          await this.redis.expire(`tag:${tag}`, strategy.ttl)
        }
      }

      return { success: true, data: true }
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'CACHE_SET_ERROR',
          message: 'Failed to set cache',
          details: error
        }
      }
    }
  }

  async get<T>(key: string): Promise<ServiceResponse<T | null>> {
    try {
      const data = await this.redis.get(key)
      
      if (data === null) {
        return { success: true, data: null }
      }

      const parsedData = typeof data === 'string' ? JSON.parse(data) : data
      return { success: true, data: parsedData as T }
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'CACHE_GET_ERROR',
          message: 'Failed to get cache',
          details: error
        }
      }
    }
  }

  async delete(key: string): Promise<ServiceResponse<boolean>> {
    try {
      await this.redis.del(key)
      return { success: true, data: true }
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'CACHE_DELETE_ERROR',
          message: 'Failed to delete cache',
          details: error
        }
      }
    }
  }

  async invalidateByTag(tag: string): Promise<ServiceResponse<number>> {
    try {
      const keys = await this.redis.smembers(`tag:${tag}`)
      
      if (keys.length === 0) {
        return { success: true, data: 0 }
      }

      // Delete all keys with this tag
      await this.redis.del(...keys)
      
      // Delete the tag set
      await this.redis.del(`tag:${tag}`)

      return { success: true, data: keys.length }
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'CACHE_INVALIDATE_ERROR',
          message: 'Failed to invalidate cache by tag',
          details: error
        }
      }
    }
  }

  async exists(key: string): Promise<boolean> {
    try {
      const result = await this.redis.exists(key)
      return result === 1
    } catch (error) {
      return false
    }
  }

  async expire(key: string, seconds: number): Promise<ServiceResponse<boolean>> {
    try {
      await this.redis.expire(key, seconds)
      return { success: true, data: true }
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'CACHE_EXPIRE_ERROR',
          message: 'Failed to set expiry',
          details: error
        }
      }
    }
  }

  async increment(key: string, amount: number = 1): Promise<ServiceResponse<number>> {
    try {
      const result = await this.redis.incrby(key, amount)
      return { success: true, data: result }
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'CACHE_INCREMENT_ERROR',
          message: 'Failed to increment',
          details: error
        }
      }
    }
  }

  // Specialized methods for common patterns
  
  async cacheResponse(intentHash: string, response: string, ttl: number = 3600): Promise<void> {
    await this.set({
      key: `response:${intentHash}`,
      ttl,
      data: response,
      tags: ['responses']
    })
  }

  async getCachedResponse(intentHash: string): Promise<string | null> {
    const result = await this.get<string>(`response:${intentHash}`)
    return result.data
  }

  async cacheSession(sessionId: string, sessionData: any, ttl: number = 1800): Promise<void> {
    await this.set({
      key: `session:${sessionId}`,
      ttl,
      data: sessionData,
      tags: ['sessions']
    })
  }

  async getSession<T>(sessionId: string): Promise<T | null> {
    const result = await this.get<T>(`session:${sessionId}`)
    return result.data
  }

  async extendSession(sessionId: string, ttl: number = 1800): Promise<void> {
    await this.expire(`session:${sessionId}`, ttl)
  }

  // Rate limiting support
  async checkRateLimit(identifier: string, windowMs: number, maxRequests: number): Promise<{
    allowed: boolean
    remaining: number
    resetTime: number
  }> {
    const key = `rate_limit:${identifier}`
    const now = Date.now()
    const windowStart = now - windowMs

    try {
      // Remove expired entries
      await this.redis.zremrangebyscore(key, 0, windowStart)
      
      // Count current requests
      const currentCount = await this.redis.zcard(key)
      
      if (currentCount >= maxRequests) {
        const oldestRequest = await this.redis.zrange(key, 0, 0, { withScores: true })
        const resetTime = oldestRequest.length > 0 ? 
          (oldestRequest[1] as number) + windowMs : 
          now + windowMs

        return {
          allowed: false,
          remaining: 0,
          resetTime
        }
      }

      // Add current request
      await this.redis.zadd(key, { score: now, member: `${now}-${Math.random()}` })
      await this.redis.expire(key, Math.ceil(windowMs / 1000))

      return {
        allowed: true,
        remaining: maxRequests - currentCount - 1,
        resetTime: now + windowMs
      }
    } catch (error) {
      // If rate limiting fails, allow the request
      console.error('Rate limiting error:', error)
      return {
        allowed: true,
        remaining: maxRequests - 1,
        resetTime: now + windowMs
      }
    }
  }

  async getStats(): Promise<{
    memoryUsage: string
    keyCount: number
    hitRate?: number
  }> {
    try {
      // Use ping to test connection instead of info()
      const ping = await this.redis.ping()
      if (ping !== 'PONG') {
        throw new Error('Redis connection failed')
      }
      
      const dbsize = await this.redis.dbsize()
      
      return {
        memoryUsage: 'N/A', // Upstash doesn't expose memory info
        keyCount: dbsize
      }
    } catch (error) {
      return {
        memoryUsage: 'Error',
        keyCount: 0
      }
    }
  }
}

export const cacheService = CacheService.getInstance()
