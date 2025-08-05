// Core Types for Voice AI Demo V2

export interface Message {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  timestamp: Date
  audioUrl?: string
  duration?: number
  language: 'vi' | 'en'
}

export interface ConversationSession {
  id: string
  userId?: string
  language: 'vi' | 'en'
  history: Message[]
  context: Record<string, any>
  state: ConversationState
  createdAt: Date
  lastActive: Date
  metadata?: {
    userAgent?: string
    ip?: string
    referrer?: string
  }
}

export enum ConversationState {
  GREETING = 'greeting',
  LISTENING = 'listening',
  PROCESSING = 'processing',
  RESPONDING = 'responding',
  CLARIFYING = 'clarifying',
  CONFIRMING = 'confirming',
  BOOKING = 'booking',
  ENDING = 'ending'
}

export interface VoiceProcessingRequest {
  sessionId: string
  audioData: string
  language: 'vi' | 'en'
  streaming?: boolean
}

export interface VoiceProcessingResponse {
  sessionId: string
  transcript: string
  response: string
  audioUrl?: string
  language: 'vi' | 'en'
  nextState?: ConversationState
  suggestions?: string[]
  context?: Record<string, any>
}

export interface StreamingChunk {
  type: 'transcript_partial' | 'transcript_final' | 'response_chunk' | 'response_complete' | 'error'
  sessionId: string
  content: string
  metadata?: Record<string, any>
}

export interface PhoneSession {
  callSid: string
  phoneNumber: string
  formData: {
    name: string
    email?: string
    language: 'vi' | 'en'
    topic: string
    preferredTime?: string
  }
  startTime: Date
  duration?: number
  transcript: string[]
  status: 'initiated' | 'connected' | 'in_progress' | 'completed' | 'failed'
  conversationSessionId?: string
}

export interface BookingRequest {
  sessionId: string
  customerInfo: {
    name: string
    phone: string
    email?: string
  }
  serviceType: string
  preferredDateTime: Date
  notes?: string
  language: 'vi' | 'en'
}

export interface AnalyticsEvent {
  type: 'conversation_start' | 'conversation_end' | 'booking_attempt' | 'booking_success' | 'error' | 'phone_call'
  sessionId: string
  timestamp: Date
  data: Record<string, any>
  cost?: number
}

export interface CacheStrategy {
  key: string
  ttl: number
  data: any
  tags?: string[]
}

export interface RateLimitRule {
  identifier: string
  windowMs: number
  maxRequests: number
  message?: string
}

export interface WebSocketConnection {
  id: string
  sessionId: string
  connected: boolean
  lastPing: Date
}

export interface ServiceResponse<T> {
  success: boolean
  data?: T
  error?: {
    code: string
    message: string
    details?: any
  }
}

export interface ConfigEnvironment {
  openai: {
    apiKey: string
    model: string
    maxTokens: number
    temperature: number
  }
  redis: {
    url: string
    token?: string
  }
  twilio: {
    accountSid: string
    authToken: string
    phoneNumber: string
    webhookUrl: string
  }
  app: {
    baseUrl: string
    sessionTtl: number
    maxHistoryLength: number
    enableAnalytics: boolean
  }
}
