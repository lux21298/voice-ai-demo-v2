import { useState, useCallback, useRef, useEffect } from 'react'
import { VoiceProcessingResponse, ConversationState, Message } from '@/lib/types'

interface UseVoiceChatOptions {
  sessionId?: string
  language?: 'vi' | 'en'
  autoStart?: boolean
  onError?: (error: string) => void
  onStateChange?: (state: ConversationState) => void
}

interface UseVoiceChatReturn {
  // State
  isRecording: boolean
  isProcessing: boolean
  currentState: ConversationState
  messages: Message[]
  suggestions: string[]
  
  // Actions
  startRecording: () => Promise<void>
  stopRecording: () => Promise<void>
  sendTextMessage: (text: string) => Promise<void>
  clearConversation: () => void
  
  // Audio
  playResponse: (audioUrl: string) => Promise<void>
  stopAudio: () => void
  
  // Session
  sessionId: string | null
  isConnected: boolean
}

export function useVoiceChat(options: UseVoiceChatOptions = {}): UseVoiceChatReturn {
  const {
    sessionId: initialSessionId,
    language = 'vi',
    autoStart = false,
    onError,
    onStateChange
  } = options

  // State
  const [sessionId, setSessionId] = useState<string | null>(initialSessionId || null)
  const [isRecording, setIsRecording] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [currentState, setCurrentState] = useState<ConversationState>(ConversationState.GREETING)
  const [messages, setMessages] = useState<Message[]>([])
  const [suggestions, setSuggestions] = useState<string[]>([])
  const [isConnected, setIsConnected] = useState(false)

  // Refs
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])
  const audioElementRef = useRef<HTMLAudioElement | null>(null)

  // Initialize session
  useEffect(() => {
    if (autoStart && !sessionId) {
      initializeSession()
    }
  }, [autoStart, sessionId])

  // Handle state changes
  useEffect(() => {
    if (onStateChange) {
      onStateChange(currentState)
    }
  }, [currentState, onStateChange])

  const initializeSession = useCallback(async () => {
    try {
      const response = await fetch('/api/voice/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ language })
      })

      if (!response.ok) {
        throw new Error('Failed to create session')
      }

      const data = await response.json()
      setSessionId(data.sessionId)
      setIsConnected(true)
      setCurrentState(ConversationState.GREETING)
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      onError?.(errorMessage)
    }
  }, [language, onError])

  const startRecording = useCallback(async () => {
    try {
      if (!sessionId) {
        await initializeSession()
      }

      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          sampleRate: 16000,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true
        }
      })

      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus'
      })

      mediaRecorderRef.current = mediaRecorder
      audioChunksRef.current = []

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data)
        }
      }

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' })
        await processAudio(audioBlob)
        
        // Stop all tracks
        stream.getTracks().forEach(track => track.stop())
      }

      mediaRecorder.start()
      setIsRecording(true)
      setCurrentState(ConversationState.LISTENING)
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to start recording'
      onError?.(errorMessage)
    }
  }, [sessionId, initializeSession, onError])

  const stopRecording = useCallback(async () => {
    if (mediaRecorderRef.current && isRecording) {
      setIsRecording(false)
      setIsProcessing(true)
      setCurrentState(ConversationState.PROCESSING)
      mediaRecorderRef.current.stop()
    }
  }, [isRecording])

  const processAudio = useCallback(async (audioBlob: Blob) => {
    try {
      if (!sessionId) {
        throw new Error('No active session')
      }

      // Convert blob to base64
      const arrayBuffer = await audioBlob.arrayBuffer()
      const uint8Array = new Uint8Array(arrayBuffer)
      const base64Audio = btoa(Array.from(uint8Array, byte => String.fromCharCode(byte)).join(''))

      const response = await fetch('/api/voice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          audioData: base64Audio,
          language
        })
      })

      if (!response.ok) {
        throw new Error('Failed to process audio')
      }

      const result: VoiceProcessingResponse = await response.json()

      // Add user message
      const userMessage: Message = {
        id: `user-${Date.now()}`,
        role: 'user',
        content: result.transcript,
        timestamp: new Date(),
        language
      }

      // Add AI response
      const aiMessage: Message = {
        id: `ai-${Date.now()}`,
        role: 'assistant',
        content: result.response,
        timestamp: new Date(),
        audioUrl: result.audioUrl,
        language
      }

      setMessages(prev => [...prev, userMessage, aiMessage])
      setSuggestions(result.suggestions || [])
      setCurrentState(result.nextState || ConversationState.LISTENING)

      // Auto-play response
      if (result.audioUrl) {
        await playResponse(result.audioUrl)
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to process audio'
      onError?.(errorMessage)
    } finally {
      setIsProcessing(false)
    }
  }, [sessionId, language, onError])

  const sendTextMessage = useCallback(async (text: string) => {
    try {
      if (!sessionId) {
        await initializeSession()
      }

      setIsProcessing(true)
      setCurrentState(ConversationState.PROCESSING)

      const response = await fetch('/api/voice/text', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          text,
          language
        })
      })

      if (!response.ok) {
        throw new Error('Failed to process text')
      }

      const result: VoiceProcessingResponse = await response.json()

      // Add messages
      const userMessage: Message = {
        id: `user-${Date.now()}`,
        role: 'user',
        content: text,
        timestamp: new Date(),
        language
      }

      const aiMessage: Message = {
        id: `ai-${Date.now()}`,
        role: 'assistant',
        content: result.response,
        timestamp: new Date(),
        audioUrl: result.audioUrl,
        language
      }

      setMessages(prev => [...prev, userMessage, aiMessage])
      setSuggestions(result.suggestions || [])
      setCurrentState(result.nextState || ConversationState.LISTENING)

      // Auto-play response
      if (result.audioUrl) {
        await playResponse(result.audioUrl)
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to send message'
      onError?.(errorMessage)
    } finally {
      setIsProcessing(false)
    }
  }, [sessionId, language, initializeSession, onError])

  const playResponse = useCallback(async (audioUrl: string): Promise<void> => {
    return new Promise((resolve, reject) => {
      try {
        if (audioElementRef.current) {
          audioElementRef.current.pause()
        }

        const audio = new Audio(audioUrl)
        audioElementRef.current = audio

        audio.onended = () => resolve()
        audio.onerror = () => reject(new Error('Failed to play audio'))
        
        audio.play().catch(reject)
      } catch (error) {
        reject(error)
      }
    })
  }, [])

  const stopAudio = useCallback(() => {
    if (audioElementRef.current) {
      audioElementRef.current.pause()
      audioElementRef.current.currentTime = 0
    }
  }, [])

  const clearConversation = useCallback(() => {
    setMessages([])
    setSuggestions([])
    setCurrentState(ConversationState.GREETING)
    setSessionId(null)
    setIsConnected(false)
  }, [])

  return {
    // State
    isRecording,
    isProcessing,
    currentState,
    messages,
    suggestions,
    
    // Actions
    startRecording,
    stopRecording,
    sendTextMessage,
    clearConversation,
    
    // Audio
    playResponse,
    stopAudio,
    
    // Session
    sessionId,
    isConnected
  }
}
