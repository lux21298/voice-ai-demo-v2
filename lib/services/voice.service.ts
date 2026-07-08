import OpenAI from 'openai'
import { configService } from './config.service'
import { conversationService } from './conversation.service'
import { cacheService } from './cache.service'
import { VoiceProcessingRequest, VoiceProcessingResponse, ServiceResponse, ConversationState } from '@/lib/types'
import { createHash } from 'crypto'

class VoiceService {
  private static instance: VoiceService
  private openai: OpenAI | null = null

  private constructor() {}

  private getOpenAIClient(): OpenAI {
    const openaiConfig = configService.getOpenAIConfig()
    if (!openaiConfig.apiKey) {
      throw new Error('OPENAI_API_KEY is not configured')
    }

    if (!this.openai) {
      this.openai = new OpenAI({
        apiKey: openaiConfig.apiKey
      })
    }

    return this.openai
  }

  public static getInstance(): VoiceService {
    if (!VoiceService.instance) {
      VoiceService.instance = new VoiceService()
    }
    return VoiceService.instance
  }

  async processVoice(request: VoiceProcessingRequest): Promise<ServiceResponse<VoiceProcessingResponse>> {
    try {
      // Get or create conversation session
      let sessionResult = await conversationService.getSession(request.sessionId)
      
      if (!sessionResult.success || !sessionResult.data) {
        const createResult = await conversationService.createSession(request.language)
        if (!createResult.success) {
          return {
            success: false,
            error: createResult.error!
          }
        }
        sessionResult = { success: true, data: createResult.data! }
      }

      const session = sessionResult.data!

      // Update session state to processing
      await conversationService.updateSessionState(request.sessionId, ConversationState.PROCESSING)

      // 1. Speech to Text
      const transcriptResult = await this.speechToText(request.audioData)
      if (!transcriptResult.success) {
        return {
          success: false,
          error: transcriptResult.error!
        }
      }

      const transcript = transcriptResult.data!

      // Add user message to conversation
      await conversationService.addMessage(request.sessionId, {
        role: 'user',
        content: transcript,
        language: request.language
      })

      // 2. Check cache for similar responses
      const cacheKey = this.generateCacheKey(transcript, session.context)
      const cachedResponse = await cacheService.getCachedResponse(cacheKey)
      
      let aiResponse: string
      if (cachedResponse) {
        aiResponse = cachedResponse
      } else {
        // 3. Generate AI response
        const responseResult = await this.generateResponse(request.sessionId, transcript)
        if (!responseResult.success) {
          return {
            success: false,
            error: responseResult.error!
          }
        }
        
        aiResponse = responseResult.data!
        
        // Cache the response
        await cacheService.cacheResponse(cacheKey, aiResponse, 3600) // 1 hour
      }

      // Add AI response to conversation
      await conversationService.addMessage(request.sessionId, {
        role: 'assistant',
        content: aiResponse,
        language: request.language
      })

      // 4. Text to Speech
      const audioResult = await this.textToSpeech(aiResponse, request.language)
      if (!audioResult.success) {
        return {
          success: false,
          error: audioResult.error!
        }
      }

      const audioUrl = audioResult.data!

      // 5. Determine next state
      const nextState = conversationService.determineNextState(
        session.state,
        transcript,
        session.context
      )

      // Update session state
      await conversationService.updateSessionState(request.sessionId, nextState)

      // 6. Generate suggestions for next user input
      const suggestions = this.generateSuggestions(nextState, request.language)

      const response: VoiceProcessingResponse = {
        sessionId: request.sessionId,
        transcript,
        response: aiResponse,
        audioUrl,
        language: request.language,
        nextState,
        suggestions,
        context: session.context
      }

      return { success: true, data: response }

    } catch (error) {
      return {
        success: false,
        error: {
          code: 'VOICE_PROCESSING_ERROR',
          message: 'Failed to process voice request',
          details: error
        }
      }
    }
  }

  private async speechToText(audioData: string): Promise<ServiceResponse<string>> {
    try {
      // Convert base64 to buffer
      const buffer = Buffer.from(audioData, 'base64')
      
      // Create a File-like object for OpenAI
      const file = new File([buffer], 'audio.wav', { type: 'audio/wav' })

      const openai = this.getOpenAIClient()
      const transcription = await openai.audio.transcriptions.create({
        file: file,
        model: 'whisper-1',
        language: 'auto' // Auto-detect language
      })

      return { success: true, data: transcription.text }
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'STT_ERROR',
          message: 'Failed to convert speech to text',
          details: error
        }
      }
    }
  }

  private async generateResponse(sessionId: string, userMessage: string): Promise<ServiceResponse<string>> {
    try {
      const sessionResult = await conversationService.getSession(sessionId)
      if (!sessionResult.success || !sessionResult.data) {
        return {
          success: false,
          error: {
            code: 'SESSION_NOT_FOUND',
            message: 'Session not found for response generation'
          }
        }
      }

      const session = sessionResult.data
      const systemPrompt = conversationService.generateSystemPrompt(session)

      // Prepare conversation history for OpenAI
      const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
        { role: 'system', content: systemPrompt }
      ]

      // Add recent conversation history
      const recentHistory = session.history.slice(-6) // Last 6 messages
      for (const msg of recentHistory) {
        if (msg.role !== 'system') {
          messages.push({
            role: msg.role as 'user' | 'assistant',
            content: msg.content
          })
        }
      }

      const openaiConfig = configService.getOpenAIConfig()
      const openai = this.getOpenAIClient()
      const completion = await openai.chat.completions.create({
        model: openaiConfig.model,
        messages,
        max_tokens: openaiConfig.maxTokens,
        temperature: openaiConfig.temperature
      })

      const response = completion.choices[0]?.message?.content
      if (!response) {
        throw new Error('No response generated from OpenAI')
      }

      return { success: true, data: response }
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'AI_RESPONSE_ERROR',
          message: 'Failed to generate AI response',
          details: error
        }
      }
    }
  }

  private async textToSpeech(text: string, language: 'vi' | 'en'): Promise<ServiceResponse<string>> {
    try {
      // Select voice based on language
      const voice = language === 'vi' ? 'nova' : 'alloy' // Nova works well for Vietnamese

      const openai = this.getOpenAIClient()
      const mp3 = await openai.audio.speech.create({
        model: 'tts-1',
        voice: voice,
        input: text
      })

      // Convert to base64 data URL
      const buffer = Buffer.from(await mp3.arrayBuffer())
      const base64 = buffer.toString('base64')
      const dataUrl = `data:audio/mpeg;base64,${base64}`

      return { success: true, data: dataUrl }
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'TTS_ERROR',
          message: 'Failed to convert text to speech',
          details: error
        }
      }
    }
  }

  private generateCacheKey(userMessage: string, context: Record<string, any>): string {
    const contextString = JSON.stringify(context)
    const combined = `${userMessage}|${contextString}`
    return createHash('md5').update(combined).digest('hex')
  }

  private generateSuggestions(state: ConversationState, language: 'vi' | 'en'): string[] {
    const suggestions = {
      vi: {
        [ConversationState.GREETING]: [
          'Tôi cần tư vấn về dịch vụ',
          'Làm thế nào để đặt lịch hẹn?',
          'Bảng giá dịch vụ như thế nào?'
        ],
        [ConversationState.LISTENING]: [
          'Có thể giải thích rõ hơn không?',
          'Tôi muốn biết thêm chi tiết',
          'Bao giờ tôi có thể được tư vấn?'
        ],
        [ConversationState.BOOKING]: [
          'Tôi muốn đặt lịch ngay',
          'Khung giờ nào còn trống?',
          'Cần chuẩn bị gì cho buổi tư vấn?'
        ],
        [ConversationState.CONFIRMING]: [
          'Vâng, thông tin chính xác',
          'Tôi muốn thay đổi thời gian',
          'Cảm ơn, hẹn gặp lại'
        ]
      },
      en: {
        [ConversationState.GREETING]: [
          'I need consultation about your services',
          'How can I book an appointment?',
          'What are your service prices?'
        ],
        [ConversationState.LISTENING]: [
          'Can you explain that in more detail?',
          'I want to know more',
          'When can I get a consultation?'
        ],
        [ConversationState.BOOKING]: [
          'I want to book now',
          'What time slots are available?',
          'What should I prepare for the consultation?'
        ],
        [ConversationState.CONFIRMING]: [
          'Yes, the information is correct',
          'I want to change the time',
          'Thank you, see you soon'
        ]
      }
    }

    return suggestions[language][state] || suggestions[language][ConversationState.LISTENING]
  }

  // Streaming support for real-time responses
  async *streamResponse(sessionId: string, userMessage: string): AsyncGenerator<string> {
    try {
      const sessionResult = await conversationService.getSession(sessionId)
      if (!sessionResult.success || !sessionResult.data) {
        yield 'Error: Session not found'
        return
      }

      const session = sessionResult.data
      const systemPrompt = conversationService.generateSystemPrompt(session)

      const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
        { role: 'system', content: systemPrompt }
      ]

      const recentHistory = session.history.slice(-6)
      for (const msg of recentHistory) {
        if (msg.role !== 'system') {
          messages.push({
            role: msg.role as 'user' | 'assistant',
            content: msg.content
          })
        }
      }

      const openaiConfig = configService.getOpenAIConfig()
      const openai = this.getOpenAIClient()
      const stream = await openai.chat.completions.create({
        model: openaiConfig.model,
        messages,
        max_tokens: openaiConfig.maxTokens,
        temperature: openaiConfig.temperature,
        stream: true
      })

      for await (const chunk of stream) {
        const content = chunk.choices[0]?.delta?.content
        if (content) {
          yield content
        }
      }
    } catch (error) {
      yield `Error: ${error instanceof Error ? error.message : 'Unknown error'}`
    }
  }

  async getUsageStats(): Promise<{
    totalRequests: number
    totalCost: number
    cacheHitRate: number
    averageResponseTime: number
  }> {
    // This would require implementing usage tracking
    return {
      totalRequests: 0,
      totalCost: 0,
      cacheHitRate: 0,
      averageResponseTime: 0
    }
  }
}

export const voiceService = VoiceService.getInstance()
