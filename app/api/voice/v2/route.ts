import { NextRequest, NextResponse } from 'next/server'
import { voiceService } from '@/lib/services/voice.service'
import { conversationService } from '@/lib/services/conversation.service'
import { analyticsService } from '@/lib/services/analytics.service'
import { VoiceProcessingRequest } from '@/lib/types'

export async function POST(request: NextRequest) {
  try {
    const body: VoiceProcessingRequest = await request.json()
    
    // Validate request
    if (!body.audioData && !body.sessionId) {
      return NextResponse.json(
        { error: 'Audio data and session ID are required' },
        { status: 400 }
      )
    }

    // Track conversation start if new session
    if (body.sessionId) {
      const sessionResult = await conversationService.getSession(body.sessionId)
      if (!sessionResult.success || !sessionResult.data) {
        await analyticsService.trackEvent({
          type: 'conversation_start',
          sessionId: body.sessionId,
          timestamp: new Date(),
          data: {
            language: body.language,
            method: 'voice'
          }
        })
      }
    }

    // Process voice request
    const result = await voiceService.processVoice(body)
    
    if (!result.success) {
      await analyticsService.trackEvent({
        type: 'error',
        sessionId: body.sessionId,
        timestamp: new Date(),
        data: {
          error: result.error?.message,
          code: result.error?.code
        }
      })

      return NextResponse.json(
        { error: result.error?.message || 'Processing failed' },
        { status: 500 }
      )
    }

    return NextResponse.json(result.data)
  } catch (error) {
    console.error('Voice API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// New endpoint for text-only processing
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { sessionId, text, language = 'vi' } = body

    if (!sessionId || !text) {
      return NextResponse.json(
        { error: 'Session ID and text are required' },
        { status: 400 }
      )
    }

    // Add user message to conversation
    await conversationService.addMessage(sessionId, {
      role: 'user',
      content: text,
      language
    })

    // Get session for context
    const sessionResult = await conversationService.getSession(sessionId)
    if (!sessionResult.success || !sessionResult.data) {
      return NextResponse.json(
        { error: 'Session not found' },
        { status: 404 }
      )
    }

    // Generate response using conversation context
    const session = sessionResult.data
    const systemPrompt = conversationService.generateSystemPrompt(session)
    
    // Simple text response for demo
    const response = language === 'vi' 
      ? `Tôi đã nhận được tin nhắn: "${text}". Đây là phản hồi từ hệ thống V2 nâng cao.`
      : `I received your message: "${text}". This is a response from the enhanced V2 system.`

    // Add AI response to conversation
    await conversationService.addMessage(sessionId, {
      role: 'assistant',
      content: response,
      language
    })

    const suggestions = language === 'vi' 
      ? ['Tôi muốn biết thêm', 'Có thể giải thích rõ hơn?', 'Cảm ơn bạn']
      : ['Tell me more', 'Can you explain further?', 'Thank you']

    return NextResponse.json({
      sessionId,
      transcript: text,
      response,
      language,
      suggestions,
      nextState: conversationService.determineNextState(session.state, text, session.context)
    })
  } catch (error) {
    console.error('Text processing error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
