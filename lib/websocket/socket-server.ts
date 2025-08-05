import { Server as SocketIOServer } from 'socket.io'
import { Server as HTTPServer } from 'http'
import type { Socket } from 'socket.io'

let io: SocketIOServer | null = null

export function initializeSocketIO(server: HTTPServer): SocketIOServer {
  if (!io) {
    io = new SocketIOServer(server, {
      cors: {
        origin: process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
        methods: ["GET", "POST"]
      }
    })

    io.on('connection', handleWebSocketConnection)
  }
  
  return io
}

export function getSocketIOInstance(): SocketIOServer | null {
  return io
}

export function handleWebSocketConnection(socket: Socket) {
  console.log('Client connected:', socket.id)

  socket.on('join_session', (sessionId: string) => {
    socket.join(sessionId)
    console.log(`Socket ${socket.id} joined session: ${sessionId}`)
  })

  socket.on('voice_chunk', async (data: {
    sessionId: string
    audioChunk: ArrayBuffer
    isLast: boolean
  }) => {
    const { sessionId, audioChunk, isLast } = data
    
    try {
      // Process audio chunk here
      // This would integrate with voice service
      
      socket.to(sessionId).emit('voice_processed', {
        sessionId,
        chunk: 'processed_audio_chunk',
        isLast
      })
    } catch (error) {
      socket.emit('error', {
        message: 'Failed to process voice chunk',
        error: error instanceof Error ? error.message : 'Unknown error'
      })
    }
  })

  socket.on('text_stream', async (data: {
    sessionId: string
    text: string
  }) => {
    const { sessionId, text } = data
    
    try {
      // Process text stream here
      // This would integrate with conversation service
      
      socket.to(sessionId).emit('text_response', {
        sessionId,
        response: 'streaming_response',
        chunk: text
      })
    } catch (error) {
      socket.emit('error', {
        message: 'Failed to process text stream',
        error: error instanceof Error ? error.message : 'Unknown error'
      })
    }
  })

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id)
  })
}
