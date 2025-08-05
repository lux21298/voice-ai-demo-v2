'use client'

import { useState, useRef, useEffect } from 'react'
import { Message } from '@/lib/types'
import { ArrowLeft, Send, Trash2, Download, Play, Pause } from 'lucide-react'
import { format } from 'date-fns'

interface ConversationViewProps {
  messages: Message[]
  language: 'vi' | 'en'
  onBack: () => void
  onSendMessage: (message: string) => Promise<void>
  onClear: () => void
}

export default function ConversationView({
  messages,
  language,
  onBack,
  onSendMessage,
  onClear
}: ConversationViewProps) {
  const [newMessage, setNewMessage] = useState('')
  const [isSending, setIsSending] = useState(false)
  const [playingAudio, setPlayingAudio] = useState<string | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSendMessage = async () => {
    if (!newMessage.trim() || isSending) return

    setIsSending(true)
    try {
      await onSendMessage(newMessage.trim())
      setNewMessage('')
    } catch (error) {
      console.error('Failed to send message:', error)
    } finally {
      setIsSending(false)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  const playAudio = async (audioUrl: string, messageId: string) => {
    try {
      if (playingAudio === messageId) {
        // Stop current audio
        if (audioRef.current) {
          audioRef.current.pause()
          audioRef.current.currentTime = 0
        }
        setPlayingAudio(null)
        return
      }

      // Stop any currently playing audio
      if (audioRef.current) {
        audioRef.current.pause()
      }

      const audio = new Audio(audioUrl)
      audioRef.current = audio
      setPlayingAudio(messageId)

      audio.onended = () => setPlayingAudio(null)
      audio.onerror = () => {
        setPlayingAudio(null)
        console.error('Failed to play audio')
      }

      await audio.play()
    } catch (error) {
      setPlayingAudio(null)
      console.error('Audio playback error:', error)
    }
  }

  const exportConversation = () => {
    const conversationText = messages
      .map(msg => {
        const timestamp = format(new Date(msg.timestamp), 'yyyy-MM-dd HH:mm:ss')
        const role = msg.role === 'user' ? 
          (language === 'vi' ? 'Người dùng' : 'User') : 
          (language === 'vi' ? 'Trợ lý AI' : 'AI Assistant')
        return `[${timestamp}] ${role}: ${msg.content}`
      })
      .join('\n\n')

    const blob = new Blob([conversationText], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `conversation-${format(new Date(), 'yyyy-MM-dd-HH-mm')}.txt`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const formatTime = (timestamp: Date) => {
    return format(new Date(timestamp), 'HH:mm')
  }

  const renderMessage = (message: Message) => {
    const isUser = message.role === 'user'
    const isPlaying = playingAudio === message.id

    return (
      <div
        key={message.id}
        className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-4`}
      >
        <div
          className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
            isUser
              ? 'bg-blue-500 text-white'
              : 'bg-gray-200 text-gray-800'
          }`}
        >
          <p className="text-sm">{message.content}</p>
          
          <div className="flex items-center justify-between mt-2">
            <span className={`text-xs ${
              isUser ? 'text-blue-100' : 'text-gray-500'
            }`}>
              {formatTime(message.timestamp)}
            </span>
            
            {message.audioUrl && !isUser && (
              <button
                onClick={() => playAudio(message.audioUrl!, message.id)}
                className={`ml-2 p-1 rounded hover:bg-opacity-80 transition-colors ${
                  isUser ? 'hover:bg-blue-400' : 'hover:bg-gray-300'
                }`}
              >
                {isPlaying ? (
                  <Pause className="w-4 h-4" />
                ) : (
                  <Play className="w-4 h-4" />
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto p-6 h-screen flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-6 pb-4 border-b">
        <div className="flex items-center space-x-4">
          <button
            onClick={onBack}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-2xl font-bold text-gray-800">
            {language === 'vi' ? 'Lịch sử cuộc trò chuyện' : 'Conversation History'}
          </h1>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={exportConversation}
            disabled={messages.length === 0}
            className="flex items-center space-x-2 px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
          >
            <Download className="w-4 h-4" />
            <span>{language === 'vi' ? 'Xuất' : 'Export'}</span>
          </button>
          
          <button
            onClick={onClear}
            disabled={messages.length === 0}
            className="flex items-center space-x-2 px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
          >
            <Trash2 className="w-4 h-4" />
            <span>{language === 'vi' ? 'Xóa' : 'Clear'}</span>
          </button>
        </div>
      </div>

      {/* Messages Container */}
      <div className="flex-1 overflow-y-auto mb-4 space-y-4">
        {messages.length === 0 ? (
          <div className="text-center text-gray-500 mt-20">
            <p className="text-lg mb-2">
              {language === 'vi' ? 'Chưa có tin nhắn nào' : 'No messages yet'}
            </p>
            <p className="text-sm">
              {language === 'vi' 
                ? 'Bắt đầu cuộc trò chuyện bằng cách gửi tin nhắn hoặc sử dụng voice'
                : 'Start a conversation by sending a message or using voice'
              }
            </p>
          </div>
        ) : (
          <>
            {messages.map(renderMessage)}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Message Input */}
      <div className="flex items-center space-x-2 p-4 bg-gray-50 rounded-lg">
        <input
          type="text"
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder={
            language === 'vi' 
              ? 'Nhập tin nhắn của bạn...' 
              : 'Type your message...'
          }
          className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          disabled={isSending}
        />
        
        <button
          onClick={handleSendMessage}
          disabled={!newMessage.trim() || isSending}
          className="p-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
        >
          {isSending ? (
            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            <Send className="w-5 h-5" />
          )}
        </button>
      </div>

      {/* Stats */}
      {messages.length > 0 && (
        <div className="mt-4 text-sm text-gray-500 text-center">
          {language === 'vi' 
            ? `${messages.length} tin nhắn`
            : `${messages.length} messages`
          }
          {messages.length > 0 && (
            <>
              {' • '}
              {language === 'vi' 
                ? `Bắt đầu ${format(new Date(messages[0].timestamp), 'dd/MM/yyyy HH:mm')}`
                : `Started ${format(new Date(messages[0].timestamp), 'MM/dd/yyyy HH:mm')}`
              }
            </>
          )}
        </div>
      )}
    </div>
  )
}
