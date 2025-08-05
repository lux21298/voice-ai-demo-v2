'use client'

import { useState } from 'react'
import dynamic from 'next/dynamic'

// Dynamically import VoiceInterface V2 with no SSR
const VoiceInterface = dynamic(() => import('@/components/VoiceInterface'), {
  ssr: false,
  loading: () => (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center">
      <div className="flex flex-col items-center space-y-4">
        <div className="w-32 h-32 rounded-full bg-gray-200 animate-pulse flex items-center justify-center">
          <span className="text-gray-500">Loading...</span>
        </div>
        <p className="text-gray-500">Loading Voice AI V2...</p>
      </div>
    </div>
  ),
})

export default function Home() {
  const [error, setError] = useState<string>('')

  const handleError = (errorMessage: string) => {
    setError(errorMessage)
    console.error('Voice AI Error:', errorMessage)
  }

  return (
    <main>
      {error && (
        <div className="fixed top-4 right-4 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded z-50">
          <strong className="font-bold">Error: </strong>
          <span className="block sm:inline">{error}</span>
          <button 
            onClick={() => setError('')}
            className="float-right ml-4 text-red-700 hover:text-red-900"
          >
            ✕
          </button>
        </div>
      )}
      
      <VoiceInterface
        initialLanguage="en"
        autoStart={true}
        showPhoneWidget={true}
        showBookingFlow={true}
        onError={handleError}
      />
    </main>
  )
}
