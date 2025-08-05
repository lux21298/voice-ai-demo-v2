import twilio from 'twilio'
import { configService } from './config.service'
import { conversationService } from './conversation.service'
import { voiceService } from './voice.service'
import { cacheService } from './cache.service'
import { analyticsService } from './analytics.service'
import { PhoneSession, ServiceResponse } from '@/lib/types'

class PhoneService {
  private static instance: PhoneService
  private twilioClient: twilio.Twilio

  private constructor() {
    const twilioConfig = configService.getTwilioConfig()
    this.twilioClient = twilio(twilioConfig.accountSid, twilioConfig.authToken)
  }

  public static getInstance(): PhoneService {
    if (!PhoneService.instance) {
      PhoneService.instance = new PhoneService()
    }
    return PhoneService.instance
  }

  async initiateCall(formData: {
    name: string
    phone: string
    email?: string
    language: 'vi' | 'en'
    topic: string
    preferredTime?: string
  }): Promise<ServiceResponse<PhoneSession>> {
    try {
      const twilioConfig = configService.getTwilioConfig()
      
      // Create phone session
      const phoneSession: PhoneSession = {
        callSid: '', // Will be set after call is created
        phoneNumber: formData.phone,
        formData,
        startTime: new Date(),
        transcript: [],
        status: 'initiated'
      }

      // Create conversation session for the call
      const conversationResult = await conversationService.createSession(formData.language)
      if (!conversationResult.success) {
        return {
          success: false,
          error: conversationResult.error!
        }
      }

      phoneSession.conversationSessionId = conversationResult.data!.id

      // Generate TwiML URL for this session
      const webhookUrl = `${configService.getAppConfig().baseUrl}/api/phone/webhook?sessionId=${phoneSession.conversationSessionId}`

      // Initiate the call
      const call = await this.twilioClient.calls.create({
        to: formData.phone,
        from: twilioConfig.phoneNumber,
        url: webhookUrl,
        record: true,
        recordingStatusCallback: `${configService.getAppConfig().baseUrl}/api/phone/recording`
      })

      phoneSession.callSid = call.sid
      phoneSession.status = 'connected'

      // Store phone session
      await cacheService.set({
        key: `phone:${call.sid}`,
        ttl: 3600, // 1 hour
        data: phoneSession,
        tags: ['phone', 'calls']
      })

      // Track analytics
      await analyticsService.trackEvent({
        type: 'phone_call',
        sessionId: phoneSession.conversationSessionId!,
        timestamp: new Date(),
        data: {
          phone: formData.phone,
          language: formData.language,
          topic: formData.topic
        }
      })

      return { success: true, data: phoneSession }
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'PHONE_INITIATE_ERROR',
          message: 'Failed to initiate phone call',
          details: error
        }
      }
    }
  }

  async handleIncomingCall(callSid: string, from: string): Promise<string> {
    try {
      // Create conversation session for incoming call
      const conversationResult = await conversationService.createSession('vi') // Default to Vietnamese
      if (!conversationResult.success) {
        return this.generateErrorTwiML('Hệ thống gặp sự cố, vui lòng thử lại sau.')
      }

      const phoneSession: PhoneSession = {
        callSid,
        phoneNumber: from,
        formData: {
          name: 'Khách hàng',
          language: 'vi',
          topic: 'Tư vấn'
        },
        startTime: new Date(),
        transcript: [],
        status: 'connected',
        conversationSessionId: conversationResult.data!.id
      }

      // Store phone session
      await cacheService.set({
        key: `phone:${callSid}`,
        ttl: 3600,
        data: phoneSession,
        tags: ['phone', 'calls']
      })

      // Generate greeting TwiML
      return this.generateGreetingTwiML(phoneSession)
    } catch (error) {
      console.error('Error handling incoming call:', error)
      return this.generateErrorTwiML('Hệ thống gặp sự cố, vui lòng thử lại sau.')
    }
  }

  async handleSpeechInput(callSid: string, speechResult: string, confidence: number): Promise<string> {
    try {
      // Get phone session
      const phoneSession = await cacheService.get<PhoneSession>(`phone:${callSid}`)
      if (!phoneSession.success || !phoneSession.data) {
        return this.generateErrorTwiML('Phiên gọi không hợp lệ.')
      }

      const session = phoneSession.data
      
      if (!session.conversationSessionId) {
        return this.generateErrorTwiML('Lỗi hệ thống.')
      }

      // Add to transcript
      session.transcript.push(`User: ${speechResult}`)
      
      // Update phone session
      await cacheService.set({
        key: `phone:${callSid}`,
        ttl: 3600,
        data: session,
        tags: ['phone', 'calls']
      })

      // Process with voice service (without audio since we have text)
      const response = await this.processTextInput(session.conversationSessionId, speechResult, session.formData.language)
      
      if (!response.success) {
        return this.generateErrorTwiML('Xin lỗi, tôi không hiểu. Bạn có thể nói lại không?')
      }

      const aiResponse = response.data!
      
      // Add AI response to transcript
      session.transcript.push(`AI: ${aiResponse}`)
      
      // Update phone session
      await cacheService.set({
        key: `phone:${callSid}`,
        ttl: 3600,
        data: session,
        tags: ['phone', 'calls']
      })

      // Generate response TwiML
      return this.generateResponseTwiML(aiResponse, session)
    } catch (error) {
      console.error('Error handling speech input:', error)
      return this.generateErrorTwiML('Xin lỗi, có lỗi xảy ra. Bạn có thể thử lại không?')
    }
  }

  private async processTextInput(sessionId: string, text: string, language: 'vi' | 'en'): Promise<ServiceResponse<string>> {
    try {
      // Add user message to conversation
      await conversationService.addMessage(sessionId, {
        role: 'user',
        content: text,
        language
      })

      // Generate AI response
      const sessionResult = await conversationService.getSession(sessionId)
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
      const systemPrompt = conversationService.generateSystemPrompt(session)

      // Use OpenAI to generate response (reuse voice service logic)
      const messages = [
        { role: 'system' as const, content: systemPrompt },
        ...session.history.slice(-6).map(msg => ({
          role: msg.role as 'user' | 'assistant',
          content: msg.content
        }))
      ]

      const openaiConfig = configService.getOpenAIConfig()
      // We'd need to access OpenAI directly here or create a text-only method in voice service
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${openaiConfig.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: openaiConfig.model,
          messages,
          max_tokens: openaiConfig.maxTokens,
          temperature: openaiConfig.temperature
        })
      })

      const data = await response.json()
      const aiResponse = data.choices[0]?.message?.content

      if (!aiResponse) {
        throw new Error('No response from OpenAI')
      }

      // Add AI response to conversation
      await conversationService.addMessage(sessionId, {
        role: 'assistant',
        content: aiResponse,
        language
      })

      return { success: true, data: aiResponse }
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'TEXT_PROCESSING_ERROR',
          message: 'Failed to process text input',
          details: error
        }
      }
    }
  }

  private generateGreetingTwiML(session: PhoneSession): string {
    const language = session.formData.language
    const greeting = language === 'vi' 
      ? `Xin chào ${session.formData.name}, cảm ơn bạn đã gọi. Tôi là trợ lý AI. Bạn muốn tư vấn về vấn đề gì?`
      : `Hello ${session.formData.name}, thank you for calling. I'm an AI assistant. What would you like to consult about?`

    const gatherLanguage = language === 'vi' ? 'vi-VN' : 'en-US'

    return `<?xml version="1.0" encoding="UTF-8"?>
<Response>
    <Say voice="Polly.Joanna" language="${gatherLanguage}">${greeting}</Say>
    <Gather action="/api/phone/speech" method="POST" input="speech" language="${gatherLanguage}" timeout="5" speechTimeout="auto">
        <Say voice="Polly.Joanna" language="${gatherLanguage}">
            ${language === 'vi' ? 'Vui lòng nói sau tiếng bíp.' : 'Please speak after the beep.'}
        </Say>
    </Gather>
    <Say voice="Polly.Joanna" language="${gatherLanguage}">
        ${language === 'vi' ? 'Tôi không nghe thấy gì. Tạm biệt.' : 'I didn\'t hear anything. Goodbye.'}
    </Say>
    <Hangup/>
</Response>`
  }

  private generateResponseTwiML(response: string, session: PhoneSession): string {
    const language = session.formData.language
    const gatherLanguage = language === 'vi' ? 'vi-VN' : 'en-US'

    // Check if conversation should end
    const shouldEnd = response.toLowerCase().includes('tạm biệt') || 
                     response.toLowerCase().includes('goodbye') ||
                     response.toLowerCase().includes('kết thúc')

    if (shouldEnd) {
      return `<?xml version="1.0" encoding="UTF-8"?>
<Response>
    <Say voice="Polly.Joanna" language="${gatherLanguage}">${response}</Say>
    <Hangup/>
</Response>`
    }

    return `<?xml version="1.0" encoding="UTF-8"?>
<Response>
    <Say voice="Polly.Joanna" language="${gatherLanguage}">${response}</Say>
    <Gather action="/api/phone/speech" method="POST" input="speech" language="${gatherLanguage}" timeout="5" speechTimeout="auto">
        <Say voice="Polly.Joanna" language="${gatherLanguage}">
            ${language === 'vi' ? 'Bạn còn muốn hỏi gì khác không?' : 'Do you have any other questions?'}
        </Say>
    </Gather>
    <Say voice="Polly.Joanna" language="${gatherLanguage}">
        ${language === 'vi' ? 'Cảm ơn bạn đã gọi. Tạm biệt.' : 'Thank you for calling. Goodbye.'}
    </Say>
    <Hangup/>
</Response>`
  }

  private generateErrorTwiML(message: string): string {
    return `<?xml version="1.0" encoding="UTF-8"?>
<Response>
    <Say voice="Polly.Joanna" language="vi-VN">${message}</Say>
    <Hangup/>
</Response>`
  }

  async handleCallStatus(callSid: string, callStatus: string, duration?: string): Promise<void> {
    try {
      const phoneSession = await cacheService.get<PhoneSession>(`phone:${callSid}`)
      if (!phoneSession.success || !phoneSession.data) {
        return
      }

      const session = phoneSession.data
      session.status = this.mapTwilioStatus(callStatus)
      
      if (duration) {
        session.duration = parseInt(duration)
      }

      // Update session
      await cacheService.set({
        key: `phone:${callSid}`,
        ttl: 3600,
        data: session,
        tags: ['phone', 'calls']
      })

      // Track analytics for call completion
      if (callStatus === 'completed' && session.conversationSessionId) {
        await analyticsService.trackEvent({
          type: 'conversation_end',
          sessionId: session.conversationSessionId,
          timestamp: new Date(),
          data: {
            duration: session.duration,
            phone: true,
            transcript: session.transcript
          }
        })
      }
    } catch (error) {
      console.error('Error handling call status:', error)
    }
  }

  private mapTwilioStatus(twilioStatus: string): PhoneSession['status'] {
    switch (twilioStatus) {
      case 'queued':
      case 'ringing':
        return 'initiated'
      case 'in-progress':
        return 'in_progress'
      case 'completed':
        return 'completed'
      case 'failed':
      case 'busy':
      case 'no-answer':
        return 'failed'
      default:
        return 'in_progress'
    }
  }

  async getCallHistory(limit: number = 50): Promise<ServiceResponse<PhoneSession[]>> {
    try {
      // This would require a more sophisticated storage system in production
      // For now, return empty array as calls are stored temporarily in Redis
      return { success: true, data: [] }
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'CALL_HISTORY_ERROR',
          message: 'Failed to get call history',
          details: error
        }
      }
    }
  }

  async getPhoneStats(): Promise<{
    totalCalls: number
    completedCalls: number
    averageCallDuration: number
    successRate: number
  }> {
    // This would require proper call tracking in production
    return {
      totalCalls: 0,
      completedCalls: 0,
      averageCallDuration: 0,
      successRate: 0
    }
  }

  // Validate Twilio webhook signature
  validateWebhookSignature(signature: string, url: string, params: Record<string, string>): boolean {
    try {
      const authToken = configService.getTwilioConfig().authToken
      return twilio.validateRequest(authToken, signature, url, params)
    } catch (error) {
      console.error('Error validating Twilio signature:', error)
      return false
    }
  }
}

export const phoneService = PhoneService.getInstance()
