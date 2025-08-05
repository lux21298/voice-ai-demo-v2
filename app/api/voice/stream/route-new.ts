import { NextRequest } from 'next/server'
import { VoiceService } from '@/lib/services/voice.service'
import { ConversationService } from '@/lib/services/conversation.service'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { type, sessionId, audioData, text, language = 'vi' } = body

    if (!sessionId) {
      return new Response('Session ID is required', { status: 400 })
    }

    switch (type) {
      case 'audio_stream':
        return handleAudioStream(sessionId, audioData, language)
      
      case 'text_stream':
        return handleTextStream(sessionId, text, language)
      
      case 'complete_stream':
        return handleCompleteStream(sessionId)
      
      default:
        return new Response('Invalid stream type', { status: 400 })
    }
  } catch (error) {
    console.error('Stream API error:', error)
    return new Response('Internal server error', { status: 500 })
  }
}

async function handleAudioStream(sessionId: string, audioData: string, language: string) {
  try {
    const voiceService = VoiceService.getInstance()
    
    // Process audio chunk
    const audioBuffer = Buffer.from(audioData, 'base64')
    const transcript = await voiceService.transcribeAudio(audioBuffer, language)
    
    return Response.json({
      success: true,
      transcript,
      sessionId,
      isPartial: true
    })
  } catch (error) {
    console.error('Audio stream error:', error)
    return new Response('Audio processing failed', { status: 500 })
  }
}

async function handleTextStream(sessionId: string, text: string, language: string) {
  try {
    const conversationService = ConversationService.getInstance()
    const voiceService = VoiceService.getInstance()
    
    // Add user message to conversation
    await conversationService.addMessage(sessionId, {
      id: `msg_${Date.now()}`,
      role: 'user',
      content: text,
      timestamp: new Date(),
      language: language as 'vi' | 'en'
    })
    
    // Generate streaming response
    const response = await conversationService.generateResponse(
      sessionId, 
      text, 
      language as 'vi' | 'en'
    )
    
    // Generate audio response
    let audioUrl = null
    if (response) {
      audioUrl = await voiceService.generateSpeech(response, language as 'vi' | 'en')
    }
    
    return Response.json({
      success: true,
      response,
      audioUrl,
      sessionId
    })
  } catch (error) {
    console.error('Text stream error:', error)
    return new Response('Text processing failed', { status: 500 })
  }
}

async function handleCompleteStream(sessionId: string) {
  try {
    const conversationService = ConversationService.getInstance()
    const session = await conversationService.getSession(sessionId)
    
    if (!session) {
      return new Response('Session not found', { status: 404 })
    }
    
    return Response.json({
      success: true,
      sessionId,
      messageCount: session.messages.length,
      isComplete: true
    })
  } catch (error) {
    console.error('Complete stream error:', error)
    return new Response('Stream completion failed', { status: 500 })
  }
}
