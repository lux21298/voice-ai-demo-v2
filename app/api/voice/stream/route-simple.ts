import { NextRequest } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { type, sessionId, text } = body

    if (!sessionId) {
      return new Response('Session ID is required', { status: 400 })
    }

    // Simple streaming simulation for now
    switch (type) {
      case 'text_stream':
        return Response.json({
          success: true,
          message: `Streaming response for: ${text}`,
          sessionId,
          timestamp: new Date().toISOString()
        })
      
      default:
        return Response.json({
          success: true,
          message: 'Stream endpoint working',
          sessionId
        })
    }
  } catch (error) {
    console.error('Stream API error:', error)
    return new Response('Internal server error', { status: 500 })
  }
}
