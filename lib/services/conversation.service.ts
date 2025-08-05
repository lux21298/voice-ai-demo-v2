import { v4 as uuidv4 } from 'uuid'
import { cacheService } from './cache.service'
import { configService } from './config.service'
import { ConversationSession, Message, ConversationState, ServiceResponse } from '@/lib/types'

class ConversationService {
  private static instance: ConversationService

  private constructor() {}

  public static getInstance(): ConversationService {
    if (!ConversationService.instance) {
      ConversationService.instance = new ConversationService()
    }
    return ConversationService.instance
  }

  async createSession(language: 'vi' | 'en' = 'vi', userId?: string): Promise<ServiceResponse<ConversationSession>> {
    try {
      const sessionId = uuidv4()
      const now = new Date()
      
      const session: ConversationSession = {
        id: sessionId,
        userId,
        language,
        history: [],
        context: {},
        state: ConversationState.GREETING,
        createdAt: now,
        lastActive: now
      }

      // Cache the session
      await cacheService.cacheSession(sessionId, session, configService.getAppConfig().sessionTtl)

      return { success: true, data: session }
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'SESSION_CREATE_ERROR',
          message: 'Failed to create conversation session',
          details: error
        }
      }
    }
  }

  async getSession(sessionId: string): Promise<ServiceResponse<ConversationSession | null>> {
    try {
      const session = await cacheService.getSession<ConversationSession>(sessionId)
      
      if (!session) {
        return { success: true, data: null }
      }

      // Extend session TTL on access
      await cacheService.extendSession(sessionId)

      return { success: true, data: session }
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'SESSION_GET_ERROR',
          message: 'Failed to get conversation session',
          details: error
        }
      }
    }
  }

  async updateSession(sessionId: string, updates: Partial<ConversationSession>): Promise<ServiceResponse<ConversationSession>> {
    try {
      const sessionResult = await this.getSession(sessionId)
      
      if (!sessionResult.success || !sessionResult.data) {
        return {
          success: false,
          error: {
            code: 'SESSION_NOT_FOUND',
            message: 'Session not found'
          }
        }
      }

      const updatedSession: ConversationSession = {
        ...sessionResult.data,
        ...updates,
        lastActive: new Date()
      }

      await cacheService.cacheSession(sessionId, updatedSession)

      return { success: true, data: updatedSession }
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'SESSION_UPDATE_ERROR',
          message: 'Failed to update conversation session',
          details: error
        }
      }
    }
  }

  async addMessage(sessionId: string, message: Omit<Message, 'id' | 'timestamp'>): Promise<ServiceResponse<ConversationSession>> {
    try {
      const sessionResult = await this.getSession(sessionId)
      
      if (!sessionResult.success || !sessionResult.data) {
        return {
          success: false,
          error: {
            code: 'SESSION_NOT_FOUND',
            message: 'Session not found'
          }
        }
      }

      const session = sessionResult.data
      const newMessage: Message = {
        ...message,
        id: uuidv4(),
        timestamp: new Date()
      }

      // Add to history and limit length
      const maxHistory = configService.getAppConfig().maxHistoryLength
      session.history.push(newMessage)
      
      if (session.history.length > maxHistory) {
        session.history = session.history.slice(-maxHistory)
      }

      session.lastActive = new Date()

      await cacheService.cacheSession(sessionId, session)

      return { success: true, data: session }
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'MESSAGE_ADD_ERROR',
          message: 'Failed to add message to conversation',
          details: error
        }
      }
    }
  }

  async updateSessionState(sessionId: string, state: ConversationState, context?: Record<string, any>): Promise<ServiceResponse<ConversationSession>> {
    const updates: Partial<ConversationSession> = { state }
    
    if (context) {
      const sessionResult = await this.getSession(sessionId)
      if (sessionResult.success && sessionResult.data) {
        updates.context = { ...sessionResult.data.context, ...context }
      }
    }

    return this.updateSession(sessionId, updates)
  }

  async getConversationContext(sessionId: string): Promise<{
    recentHistory: Message[]
    currentState: ConversationState
    contextData: Record<string, any>
    summary: string
  }> {
    const sessionResult = await this.getSession(sessionId)
    
    if (!sessionResult.success || !sessionResult.data) {
      return {
        recentHistory: [],
        currentState: ConversationState.GREETING,
        contextData: {},
        summary: 'No conversation history'
      }
    }

    const session = sessionResult.data
    const recentHistory = session.history.slice(-5) // Last 5 messages

    // Generate summary
    let summary = 'New conversation'
    if (session.history.length > 0) {
      const userMessages = session.history.filter(m => m.role === 'user').length
      const topics = this.extractTopics(session.history)
      summary = `${userMessages} user messages. Topics: ${topics.join(', ')}`
    }

    return {
      recentHistory,
      currentState: session.state,
      contextData: session.context,
      summary
    }
  }

  private extractTopics(history: Message[]): string[] {
    // Simple topic extraction based on keywords
    const topicKeywords = {
      'consultation': ['tư vấn', 'consultation', 'consult', 'advice'],
      'booking': ['đặt lịch', 'book', 'appointment', 'schedule'],
      'service': ['dịch vụ', 'service', 'product'],
      'pricing': ['giá', 'price', 'cost', 'fee'],
      'contact': ['liên hệ', 'contact', 'phone', 'email']
    }

    const topics = new Set<string>()
    const allText = history.map(m => m.content.toLowerCase()).join(' ')

    for (const [topic, keywords] of Object.entries(topicKeywords)) {
      if (keywords.some(keyword => allText.includes(keyword))) {
        topics.add(topic)
      }
    }

    return Array.from(topics)
  }

  async deleteSession(sessionId: string): Promise<ServiceResponse<boolean>> {
    try {
      await cacheService.delete(`session:${sessionId}`)
      return { success: true, data: true }
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'SESSION_DELETE_ERROR',
          message: 'Failed to delete session',
          details: error
        }
      }
    }
  }

  async getSessionStats(): Promise<{
    activeSessions: number
    totalMessages: number
    averageSessionLength: number
  }> {
    // This would require more sophisticated tracking in a real implementation
    return {
      activeSessions: 0,
      totalMessages: 0,
      averageSessionLength: 0
    }
  }

  // Helper method to determine next state based on conversation flow
  determineNextState(currentState: ConversationState, userMessage: string, context: Record<string, any>): ConversationState {
    const message = userMessage.toLowerCase()

    // Simple state machine logic
    switch (currentState) {
      case ConversationState.GREETING:
        if (message.includes('đặt lịch') || message.includes('book') || message.includes('appointment')) {
          return ConversationState.BOOKING
        }
        return ConversationState.LISTENING

      case ConversationState.LISTENING:
        if (message.includes('không hiểu') || message.includes('clarify') || message.includes('?')) {
          return ConversationState.CLARIFYING
        }
        if (message.includes('đặt lịch') || message.includes('book')) {
          return ConversationState.BOOKING
        }
        return ConversationState.RESPONDING

      case ConversationState.CLARIFYING:
        return ConversationState.RESPONDING

      case ConversationState.RESPONDING:
        if (message.includes('cảm ơn') || message.includes('thank') || message.includes('bye')) {
          return ConversationState.ENDING
        }
        return ConversationState.LISTENING

      case ConversationState.BOOKING:
        if (context.bookingComplete) {
          return ConversationState.CONFIRMING
        }
        return ConversationState.BOOKING

      case ConversationState.CONFIRMING:
        return ConversationState.ENDING

      default:
        return ConversationState.LISTENING
    }
  }

  // Generate contextual prompts based on conversation state
  generateSystemPrompt(session: ConversationSession): string {
    const basePrompt = session.language === 'vi' 
      ? 'Bạn là trợ lý AI chuyên nghiệp của công ty tư vấn. Hãy trả lời một cách thân thiện và hữu ích.'
      : 'You are a professional AI assistant for a consulting company. Please respond in a friendly and helpful manner.'

    const statePrompts = {
      [ConversationState.GREETING]: session.language === 'vi'
        ? 'Hãy chào hỏi khách hàng và hỏi họ cần hỗ trợ gì.'
        : 'Please greet the customer and ask how you can help them.',
      
      [ConversationState.LISTENING]: session.language === 'vi'
        ? 'Hãy lắng nghe và hiểu nhu cầu của khách hàng.'
        : 'Please listen and understand the customer\'s needs.',
      
      [ConversationState.CLARIFYING]: session.language === 'vi'
        ? 'Hãy đặt câu hỏi để làm rõ yêu cầu của khách hàng.'
        : 'Please ask questions to clarify the customer\'s requirements.',
      
      [ConversationState.BOOKING]: session.language === 'vi'
        ? 'Hãy hướng dẫn khách hàng quy trình đặt lịch tư vấn.'
        : 'Please guide the customer through the consultation booking process.',
      
      [ConversationState.CONFIRMING]: session.language === 'vi'
        ? 'Hãy xác nhận thông tin đặt lịch với khách hàng.'
        : 'Please confirm the booking information with the customer.',
      
      [ConversationState.ENDING]: session.language === 'vi'
        ? 'Hãy cảm ơn khách hàng và kết thúc cuộc trò chuyện một cách lịch sự.'
        : 'Please thank the customer and end the conversation politely.'
    }

    let contextInfo = ''
    if (session.history.length > 0) {
      const lastMessages = session.history.slice(-3).map(m => `${m.role}: ${m.content}`).join('\n')
      contextInfo = session.language === 'vi'
        ? `\n\nNgữ cảnh cuộc trò chuyện:\n${lastMessages}`
        : `\n\nConversation context:\n${lastMessages}`
    }

    return `${basePrompt}\n\n${statePrompts[session.state]}${contextInfo}`
  }
}

export const conversationService = ConversationService.getInstance()
