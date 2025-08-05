import { NextRequest, NextResponse } from 'next/server'
import { conversationService } from '@/lib/services/conversation.service'
import { analyticsService } from '@/lib/services/analytics.service'

// Create new session
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { language = 'vi', userId } = body

    const result = await conversationService.createSession(language, userId)
    
    if (!result.success) {
      return NextResponse.json(
        { error: result.error?.message || 'Failed to create session' },
        { status: 500 }
      )
    }

    // Track session creation
    await analyticsService.trackEvent({
      type: 'conversation_start',
      sessionId: result.data!.id,
      timestamp: new Date(),
      data: {
        language,
        userId: userId || 'anonymous'
      }
    })

    return NextResponse.json({
      sessionId: result.data!.id,
      language: result.data!.language,
      state: result.data!.state,
      createdAt: result.data!.createdAt
    })
  } catch (error) {
    console.error('Session creation error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// Get session info
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const sessionId = searchParams.get('sessionId')

    if (!sessionId) {
      return NextResponse.json(
        { error: 'Session ID is required' },
        { status: 400 }
      )
    }

    const result = await conversationService.getSession(sessionId)
    
    if (!result.success) {
      return NextResponse.json(
        { error: result.error?.message || 'Failed to get session' },
        { status: 500 }
      )
    }

    if (!result.data) {
      return NextResponse.json(
        { error: 'Session not found' },
        { status: 404 }
      )
    }

    // Get conversation context
    const context = await conversationService.getConversationContext(sessionId)

    return NextResponse.json({
      session: {
        id: result.data.id,
        language: result.data.language,
        state: result.data.state,
        createdAt: result.data.createdAt,
        lastActive: result.data.lastActive
      },
      context,
      messageCount: result.data.history.length
    })
  } catch (error) {
    console.error('Session get error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// Delete session
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const sessionId = searchParams.get('sessionId')

    if (!sessionId) {
      return NextResponse.json(
        { error: 'Session ID is required' },
        { status: 400 }
      )
    }

    // Get session for analytics before deletion
    const sessionResult = await conversationService.getSession(sessionId)
    
    const result = await conversationService.deleteSession(sessionId)
    
    if (!result.success) {
      return NextResponse.json(
        { error: result.error?.message || 'Failed to delete session' },
        { status: 500 }
      )
    }

    // Track session end
    if (sessionResult.success && sessionResult.data) {
      const duration = Date.now() - sessionResult.data.createdAt.getTime()
      await analyticsService.trackEvent({
        type: 'conversation_end',
        sessionId,
        timestamp: new Date(),
        data: {
          duration: Math.round(duration / 1000), // in seconds
          messageCount: sessionResult.data.history.length
        }
      })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Session deletion error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
