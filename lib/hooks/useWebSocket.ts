import { useState, useEffect, useRef, useCallback } from 'react'
import { StreamingChunk } from '@/lib/types'

interface UseWebSocketOptions {
  url?: string
  sessionId?: string
  autoConnect?: boolean
  onMessage?: (chunk: StreamingChunk) => void
  onError?: (error: string) => void
  onConnect?: () => void
  onDisconnect?: () => void
}

interface UseWebSocketReturn {
  isConnected: boolean
  isConnecting: boolean
  connect: () => void
  disconnect: () => void
  sendMessage: (message: any) => void
  lastMessage: StreamingChunk | null
  connectionState: 'disconnected' | 'connecting' | 'connected' | 'error'
}

export function useWebSocket(options: UseWebSocketOptions = {}): UseWebSocketReturn {
  const {
    url = `/api/voice/stream`,
    sessionId,
    autoConnect = false,
    onMessage,
    onError,
    onConnect,
    onDisconnect
  } = options

  const [isConnected, setIsConnected] = useState(false)
  const [isConnecting, setIsConnecting] = useState(false)
  const [lastMessage, setLastMessage] = useState<StreamingChunk | null>(null)
  const [connectionState, setConnectionState] = useState<'disconnected' | 'connecting' | 'connected' | 'error'>('disconnected')

  const wsRef = useRef<WebSocket | null>(null)
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const reconnectAttemptsRef = useRef(0)
  const maxReconnectAttempts = 5
  const reconnectDelay = 1000

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      return
    }

    setIsConnecting(true)
    setConnectionState('connecting')

    try {
      const wsUrl = new URL(url, window.location.origin)
      wsUrl.protocol = wsUrl.protocol === 'https:' ? 'wss:' : 'ws:'
      
      if (sessionId) {
        wsUrl.searchParams.set('sessionId', sessionId)
      }

      const ws = new WebSocket(wsUrl.toString())
      wsRef.current = ws

      ws.onopen = () => {
        setIsConnected(true)
        setIsConnecting(false)
        setConnectionState('connected')
        reconnectAttemptsRef.current = 0
        onConnect?.()
      }

      ws.onmessage = (event) => {
        try {
          const chunk: StreamingChunk = JSON.parse(event.data)
          setLastMessage(chunk)
          onMessage?.(chunk)
        } catch (error) {
          console.error('Failed to parse WebSocket message:', error)
          onError?.('Invalid message format')
        }
      }

      ws.onclose = (event) => {
        setIsConnected(false)
        setIsConnecting(false)
        
        if (event.wasClean) {
          setConnectionState('disconnected')
          onDisconnect?.()
        } else {
          setConnectionState('error')
          attemptReconnect()
        }
      }

      ws.onerror = (error) => {
        console.error('WebSocket error:', error)
        setConnectionState('error')
        onError?.('Connection error')
      }
    } catch (error) {
      setIsConnecting(false)
      setConnectionState('error')
      const errorMessage = error instanceof Error ? error.message : 'Failed to connect'
      onError?.(errorMessage)
    }
  }, [url, sessionId, onConnect, onMessage, onError, onDisconnect])

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current)
      reconnectTimeoutRef.current = null
    }

    if (wsRef.current) {
      wsRef.current.close(1000, 'Normal closure')
      wsRef.current = null
    }

    setIsConnected(false)
    setIsConnecting(false)
    setConnectionState('disconnected')
    reconnectAttemptsRef.current = 0
  }, [])

  const attemptReconnect = useCallback(() => {
    if (reconnectAttemptsRef.current >= maxReconnectAttempts) {
      setConnectionState('error')
      onError?.('Max reconnection attempts reached')
      return
    }

    reconnectAttemptsRef.current += 1
    const delay = reconnectDelay * Math.pow(2, reconnectAttemptsRef.current - 1)

    reconnectTimeoutRef.current = setTimeout(() => {
      if (wsRef.current?.readyState !== WebSocket.OPEN) {
        connect()
      }
    }, delay)
  }, [connect, onError])

  const sendMessage = useCallback((message: any) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      try {
        wsRef.current.send(JSON.stringify(message))
      } catch (error) {
        console.error('Failed to send WebSocket message:', error)
        onError?.('Failed to send message')
      }
    } else {
      onError?.('WebSocket is not connected')
    }
  }, [onError])

  // Auto-connect effect
  useEffect(() => {
    if (autoConnect && sessionId) {
      connect()
    }

    return () => {
      disconnect()
    }
  }, [autoConnect, sessionId, connect, disconnect])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      disconnect()
    }
  }, [disconnect])

  return {
    isConnected,
    isConnecting,
    connect,
    disconnect,
    sendMessage,
    lastMessage,
    connectionState
  }
}

// Specialized hook for voice streaming
interface UseVoiceStreamOptions {
  sessionId?: string
  language?: 'vi' | 'en'
  onTranscriptPartial?: (text: string) => void
  onTranscriptFinal?: (text: string) => void
  onResponseChunk?: (chunk: string) => void
  onResponseComplete?: (fullResponse: string) => void
  onError?: (error: string) => void
}

export function useVoiceStream(options: UseVoiceStreamOptions = {}) {
  const {
    sessionId,
    language = 'vi',
    onTranscriptPartial,
    onTranscriptFinal,
    onResponseChunk,
    onResponseComplete,
    onError
  } = options

  const [partialTranscript, setPartialTranscript] = useState('')
  const [finalTranscript, setFinalTranscript] = useState('')
  const [responseChunks, setResponseChunks] = useState<string[]>([])
  const [fullResponse, setFullResponse] = useState('')
  const [isStreaming, setIsStreaming] = useState(false)

  const handleMessage = useCallback((chunk: StreamingChunk) => {
    switch (chunk.type) {
      case 'transcript_partial':
        setPartialTranscript(chunk.content)
        onTranscriptPartial?.(chunk.content)
        break

      case 'transcript_final':
        setFinalTranscript(chunk.content)
        setPartialTranscript('')
        onTranscriptFinal?.(chunk.content)
        break

      case 'response_chunk':
        setResponseChunks(prev => {
          const updated = [...prev, chunk.content]
          const fullText = updated.join('')
          setFullResponse(fullText)
          onResponseChunk?.(chunk.content)
          return updated
        })
        setIsStreaming(true)
        break

      case 'response_complete':
        setIsStreaming(false)
        onResponseComplete?.(fullResponse)
        break

      case 'error':
        setIsStreaming(false)
        onError?.(chunk.content)
        break
    }
  }, [onTranscriptPartial, onTranscriptFinal, onResponseChunk, onResponseComplete, onError, fullResponse])

  const webSocket = useWebSocket({
    url: '/api/voice/stream',
    sessionId,
    autoConnect: true,
    onMessage: handleMessage,
    onError
  })

  const startStreaming = useCallback((audioData: string) => {
    setPartialTranscript('')
    setFinalTranscript('')
    setResponseChunks([])
    setFullResponse('')
    setIsStreaming(true)

    webSocket.sendMessage({
      type: 'audio_stream',
      sessionId,
      audioData,
      language
    })
  }, [webSocket, sessionId, language])

  const sendTextStream = useCallback((text: string) => {
    setResponseChunks([])
    setFullResponse('')
    setIsStreaming(true)

    webSocket.sendMessage({
      type: 'text_stream',
      sessionId,
      text,
      language
    })
  }, [webSocket, sessionId, language])

  const stopStreaming = useCallback(() => {
    setIsStreaming(false)
    webSocket.sendMessage({
      type: 'stop_stream',
      sessionId
    })
  }, [webSocket, sessionId])

  return {
    // WebSocket state
    ...webSocket,
    
    // Streaming state
    partialTranscript,
    finalTranscript,
    responseChunks,
    fullResponse,
    isStreaming,
    
    // Actions
    startStreaming,
    sendTextStream,
    stopStreaming
  }
}
