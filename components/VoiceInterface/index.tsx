'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Mic, MicOff, Phone, MessageSquare, Settings, Volume2, VolumeX } from 'lucide-react'
import { useVoiceChat } from '@/lib/hooks/useVoiceChat'
import { ConversationState } from '@/lib/types'
import ConversationView from './ConversationView'
import PhoneWidget from './PhoneWidget'
import BookingFlow from './BookingFlow'

interface VoiceInterfaceProps {
  initialLanguage?: 'vi' | 'en'
  autoStart?: boolean
  showPhoneWidget?: boolean
  showBookingFlow?: boolean
  onError?: (error: string) => void
}

export default function VoiceInterface({
  initialLanguage = 'en',
  autoStart = false,
  showPhoneWidget = true,
  showBookingFlow = true,
  onError
}: VoiceInterfaceProps) {
  const [language, setLanguage] = useState<'vi' | 'en'>(initialLanguage)
  const [showConversation, setShowConversation] = useState(false)
  const [showPhone, setShowPhone] = useState(false)
  const [showBooking, setShowBooking] = useState(false)
  const [audioEnabled, setAudioEnabled] = useState(true)
  const [currentView, setCurrentView] = useState<'voice' | 'conversation' | 'phone' | 'booking'>('voice')

  const {
    isRecording,
    isProcessing,
    currentState,
    messages,
    suggestions,
    startRecording,
    stopRecording,
    sendTextMessage,
    clearConversation,
    playResponse,
    stopAudio,
    sessionId,
    isConnected
  } = useVoiceChat({
    language,
    autoStart,
    onError,
    onStateChange: (state) => {
      if (state === ConversationState.BOOKING) {
        setShowBooking(true)
        setCurrentView('booking')
      }
    }
  })

  const handleVoiceButtonClick = async () => {
    if (isRecording) {
      await stopRecording()
    } else {
      await startRecording()
    }
  }

  const handleSuggestionClick = async (suggestion: string) => {
    await sendTextMessage(suggestion)
  }

  const handleLanguageChange = (newLanguage: 'vi' | 'en') => {
    setLanguage(newLanguage)
    clearConversation()
  }

  const getStateMessage = () => {
    switch (currentState) {
      case ConversationState.GREETING:
        return language === 'vi' ? 'Chào bạn! Tôi có thể giúp gì cho bạn?' : 'Hello! How can I help you?'
      case ConversationState.LISTENING:
        return language === 'vi' ? 'Tôi đang lắng nghe...' : 'I\'m listening...'
      case ConversationState.PROCESSING:
        return language === 'vi' ? 'Đang xử lý...' : 'Processing...'
      case ConversationState.RESPONDING:
        return language === 'vi' ? 'Đang trả lời...' : 'Responding...'
      case ConversationState.BOOKING:
        return language === 'vi' ? 'Đặt lịch tư vấn' : 'Booking consultation'
      default:
        return language === 'vi' ? 'Sẵn sàng trò chuyện' : 'Ready to chat'
    }
  }

  const renderMainInterface = () => (
    <div className="max-w-4xl mx-auto p-6">
      {/* Header */}
      <div className="text-center mb-8">
        <motion.h1 
          className="text-4xl font-bold text-gray-800 mb-4"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          {language === 'vi' ? 'Trợ lý AI Voice V2' : 'AI Voice Assistant V2'}
        </motion.h1>
        
        <motion.p 
          className="text-lg text-gray-600 mb-6"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          {getStateMessage()}
        </motion.p>

        {/* Status Indicators */}
        <div className="flex justify-center space-x-4 mb-6">
          <div className={`flex items-center space-x-2 px-3 py-1 rounded-full text-sm ${
            isConnected ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
          }`}>
            <div className={`w-2 h-2 rounded-full ${
              isConnected ? 'bg-green-500' : 'bg-red-500'
            }`} />
            <span>{isConnected ? 
              (language === 'vi' ? 'Đã kết nối' : 'Connected') : 
              (language === 'vi' ? 'Chưa kết nối' : 'Disconnected')
            }</span>
          </div>
          
          {sessionId && (
            <div className="flex items-center space-x-2 px-3 py-1 rounded-full text-sm bg-blue-100 text-blue-800">
              <span>{language === 'vi' ? 'Phiên:' : 'Session:'} {sessionId.slice(0, 8)}...</span>
            </div>
          )}
        </div>
      </div>

      {/* Main Voice Interface */}
      <div className="flex flex-col items-center space-y-8">
        {/* Voice Button */}
        <motion.button
          onClick={handleVoiceButtonClick}
          disabled={isProcessing}
          className={`relative w-32 h-32 rounded-full flex items-center justify-center transition-all duration-200 ${
            isRecording 
              ? 'bg-red-500 shadow-lg shadow-red-200' 
              : isProcessing
              ? 'bg-yellow-500 shadow-lg shadow-yellow-200'
              : 'bg-blue-500 hover:bg-blue-600 shadow-lg shadow-blue-200'
          }`}
          whileTap={{ scale: 0.95 }}
          whileHover={{ scale: 1.05 }}
        >
          {/* Pulse Animation */}
          {isRecording && (
            <motion.div
              className="absolute inset-0 rounded-full bg-red-500"
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ duration: 1, repeat: Infinity }}
              style={{ opacity: 0.3 }}
            />
          )}
          
          {/* Processing Animation */}
          {isProcessing && (
            <motion.div
              className="absolute inset-0 rounded-full border-4 border-yellow-300"
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
            />
          )}

          {/* Icon */}
          {isRecording ? (
            <MicOff className="w-12 h-12 text-white" />
          ) : (
            <Mic className="w-12 h-12 text-white" />
          )}
        </motion.button>

        {/* Recording Indicator */}
        <AnimatePresence>
          {isRecording && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              className="text-red-600 font-semibold"
            >
              {language === 'vi' ? '🔴 Đang ghi âm...' : '🔴 Recording...'}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Suggestions */}
        {suggestions.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full max-w-2xl"
          >
            <h3 className="text-lg font-semibold text-gray-700 mb-3 text-center">
              {language === 'vi' ? 'Gợi ý câu hỏi:' : 'Suggested questions:'}
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {suggestions.map((suggestion, index) => (
                <motion.button
                  key={index}
                  onClick={() => handleSuggestionClick(suggestion)}
                  className="p-3 text-left bg-gray-50 hover:bg-gray-100 rounded-lg border border-gray-200 transition-colors"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  {suggestion}
                </motion.button>
              ))}
            </div>
          </motion.div>
        )}

        {/* Action Buttons */}
        <div className="flex space-x-4">
          <motion.button
            onClick={() => setCurrentView('conversation')}
            className="flex items-center space-x-2 px-6 py-3 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <MessageSquare className="w-5 h-5" />
            <span>{language === 'vi' ? 'Lịch sử' : 'History'}</span>
          </motion.button>

          {showPhoneWidget && (
            <motion.button
              onClick={() => setCurrentView('phone')}
              className="flex items-center space-x-2 px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <Phone className="w-5 h-5" />
              <span>{language === 'vi' ? 'Gọi điện' : 'Call'}</span>
            </motion.button>
          )}

          <motion.button
            onClick={() => setAudioEnabled(!audioEnabled)}
            className={`flex items-center space-x-2 px-6 py-3 rounded-lg transition-colors ${
              audioEnabled 
                ? 'bg-blue-600 hover:bg-blue-700 text-white' 
                : 'bg-gray-300 hover:bg-gray-400 text-gray-700'
            }`}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            {audioEnabled ? (
              <Volume2 className="w-5 h-5" />
            ) : (
              <VolumeX className="w-5 h-5" />
            )}
          </motion.button>
        </div>

        {/* Language Toggle */}
        <div className="flex items-center space-x-2">
          <span className="text-sm text-gray-600">
            {language === 'vi' ? 'Ngôn ngữ:' : 'Language:'}
          </span>
          <div className="flex bg-gray-200 rounded-lg p-1">
            <button
              onClick={() => handleLanguageChange('vi')}
              className={`px-3 py-1 rounded transition-colors ${
                language === 'vi' 
                  ? 'bg-white text-blue-600 shadow-sm' 
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              Tiếng Việt
            </button>
            <button
              onClick={() => handleLanguageChange('en')}
              className={`px-3 py-1 rounded transition-colors ${
                language === 'en' 
                  ? 'bg-white text-blue-600 shadow-sm' 
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              English
            </button>
          </div>
        </div>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <AnimatePresence mode="wait">
        {currentView === 'voice' && (
          <motion.div
            key="voice"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            {renderMainInterface()}
          </motion.div>
        )}

        {currentView === 'conversation' && (
          <motion.div
            key="conversation"
            initial={{ opacity: 0, x: 100 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -100 }}
            transition={{ duration: 0.3 }}
          >
            <ConversationView
              messages={messages}
              language={language}
              onBack={() => setCurrentView('voice')}
              onSendMessage={sendTextMessage}
              onClear={clearConversation}
            />
          </motion.div>
        )}

        {currentView === 'phone' && showPhoneWidget && (
          <motion.div
            key="phone"
            initial={{ opacity: 0, y: 100 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -100 }}
            transition={{ duration: 0.3 }}
          >
            <PhoneWidget
              language={language}
              onBack={() => setCurrentView('voice')}
              onCallInitiated={() => {
                // Handle call initiation
              }}
            />
          </motion.div>
        )}

        {currentView === 'booking' && showBookingFlow && (
          <motion.div
            key="booking"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.1 }}
            transition={{ duration: 0.3 }}
          >
            <BookingFlow
              language={language}
              sessionId={sessionId}
              onBack={() => setCurrentView('voice')}
              onBookingComplete={() => {
                // Handle booking completion
                setCurrentView('voice')
              }}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
