import { ConfigEnvironment } from '@/lib/types'

class ConfigService {
  private static instance: ConfigService
  private config: ConfigEnvironment

  private constructor() {
    this.config = {
      openai: {
        apiKey: process.env.OPENAI_API_KEY || '',
        model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
        maxTokens: parseInt(process.env.OPENAI_MAX_TOKENS || '1000'),
        temperature: parseFloat(process.env.OPENAI_TEMPERATURE || '0.7')
      },
      redis: {
        url: process.env.UPSTASH_REDIS_REST_URL || '',
        token: process.env.UPSTASH_REDIS_REST_TOKEN || ''
      },
      twilio: {
        accountSid: process.env.TWILIO_ACCOUNT_SID || '',
        authToken: process.env.TWILIO_AUTH_TOKEN || '',
        phoneNumber: process.env.TWILIO_PHONE_NUMBER || '',
        webhookUrl: process.env.TWILIO_WEBHOOK_URL || ''
      },
      app: {
        baseUrl: process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000',
        sessionTtl: parseInt(process.env.SESSION_TTL || '1800'), // 30 minutes
        maxHistoryLength: parseInt(process.env.MAX_HISTORY_LENGTH || '10'),
        enableAnalytics: process.env.ENABLE_ANALYTICS === 'true'
      }
    }
  }

  public static getInstance(): ConfigService {
    if (!ConfigService.instance) {
      ConfigService.instance = new ConfigService()
    }
    return ConfigService.instance
  }

  public getConfig(): ConfigEnvironment {
    return this.config
  }

  public getOpenAIConfig() {
    return this.config.openai
  }

  public getRedisConfig() {
    return this.config.redis
  }

  public getTwilioConfig() {
    return this.config.twilio
  }

  public getAppConfig() {
    return this.config.app
  }

  public isProduction(): boolean {
    return process.env.NODE_ENV === 'production'
  }

  public validateConfig(): { isValid: boolean; errors: string[] } {
    const errors: string[] = []

    if (!this.config.openai.apiKey) {
      errors.push('OPENAI_API_KEY is required')
    }

    if (!this.config.redis.url) {
      errors.push('UPSTASH_REDIS_REST_URL is required')
    }

    if (!this.config.redis.token) {
      errors.push('UPSTASH_REDIS_REST_TOKEN is required')
    }

    return {
      isValid: errors.length === 0,
      errors
    }
  }
}

export const configService = ConfigService.getInstance()
