'use client'

import { useEffect, useState } from 'react'
import { ReactMediaRecorder } from 'react-media-recorder'

interface VoiceResponse {
  transcript: string
  response: string
  audioUrl: string
  language: 'vi' | 'en'
}

interface VoiceRecorderProps {
  onVoiceProcessed: (result: VoiceResponse) => void
  onProcessingStart: () => void
  onError: (error: string) => void
  isProcessing: boolean
}

export default function VoiceRecorder({
  onVoiceProcessed,
  onProcessingStart,
  onError,
  isProcessing,
}: VoiceRecorderProps) {
  const [recordingTime, setRecordingTime] = useState<number>(0)
  const [isClient, setIsClient] = useState(false)

  useEffect(() => {
    setIsClient(true)
  }, [])

  if (!isClient) {
    return (
      <div className="flex flex-col items-center space-y-4">
        <div className="w-32 h-32 rounded-full bg-gray-200 animate-pulse flex items-center justify-center">
          <span className="text-gray-500">Loading...</span>
        </div>
        <p className="text-gray-500">Initializing voice recorder...</p>
      </div>
    )
  }

  const processAudio = async (_mediaBlobUrl: string, blob: Blob) => {
    try {
      onProcessingStart()

      const formData = new FormData()
      formData.append('audio', blob, 'recording.webm')

      const response = await fetch('/api/voice', {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const result: VoiceResponse = await response.json()
      onVoiceProcessed(result)
    } catch (error) {
      console.error('Error processing audio:', error)
      onError(error instanceof Error ? error.message : 'Unknown error occurred')
    }
  }

  return (
    <div className="flex flex-col items-center space-y-4">
      <ReactMediaRecorder
        audio
        onStart={() => {
          setRecordingTime(0)

          const timer = setInterval(() => {
            setRecordingTime((previous) => {
              if (previous >= 10) {
                clearInterval(timer)
                return previous
              }
              return previous + 1
            })
          }, 1000)
        }}
        onStop={(blobUrl, blob) => {
          setRecordingTime(0)
          if (blob) {
            processAudio(blobUrl, blob)
          }
        }}
        render={({ status, startRecording, stopRecording }) => (
          <div className="flex flex-col items-center space-y-4">
            <button
              onClick={() => {
                if (status === 'recording') {
                  stopRecording()
                } else if (!isProcessing) {
                  startRecording()
                }
              }}
              disabled={isProcessing}
              className={`
                relative w-32 h-32 rounded-full text-white font-bold text-lg
                transition-all duration-200 transform hover:scale-105
                ${status === 'recording'
                  ? 'bg-red-500 hover:bg-red-600 animate-pulse'
                  : isProcessing
                    ? 'bg-gray-400 cursor-not-allowed'
                    : 'bg-blue-500 hover:bg-blue-600'
                }
                ${isProcessing ? '' : 'shadow-lg hover:shadow-xl'}
              `}
            >
              {status === 'recording' ? (
                <div className="flex flex-col items-center">
                  <span className="text-sm">Đang ghi...</span>
                  <span className="text-xs">{recordingTime}s</span>
                </div>
              ) : isProcessing ? (
                <div className="flex flex-col items-center">
                  <span className="text-sm">Xử lý...</span>
                </div>
              ) : (
                <div className="flex flex-col items-center">
                  <span className="text-sm">Nhấn để nói</span>
                </div>
              )}
            </button>

            <div className="text-center text-gray-600">
              {status === 'recording' && (
                <p>Đang ghi âm... ({recordingTime}/10 giây)</p>
              )}
              {status === 'idle' && !isProcessing && (
                <p>Nhấn nút để bắt đầu ghi âm (tối đa 10 giây)</p>
              )}
              {isProcessing && (
                <p>Đang xử lý âm thanh...</p>
              )}
            </div>

            {status === 'recording' && recordingTime >= 8 && (
              <div className="text-orange-500 text-sm animate-bounce">
                Sẽ tự động dừng sau {10 - recordingTime} giây
              </div>
            )}
          </div>
        )}
      />

      <div className="text-center text-sm text-gray-500 max-w-md">
        <p className="mb-2">
          <strong>Hướng dẫn:</strong>
        </p>
        <ul className="text-left space-y-1">
          <li>Cho phép truy cập microphone khi được hỏi</li>
          <li>Nói rõ ràng trong 10 giây</li>
          <li>Hỗ trợ tiếng Việt và tiếng Anh</li>
          <li>Ví dụ: &quot;Học phí bootcamp bao nhiêu?&quot;</li>
        </ul>
      </div>
    </div>
  )
}
