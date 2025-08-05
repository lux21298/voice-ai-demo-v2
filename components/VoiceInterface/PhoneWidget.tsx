'use client'

import { useState } from 'react'
import { ArrowLeft, Phone, PhoneCall, CheckCircle, XCircle, Clock } from 'lucide-react'

interface PhoneWidgetProps {
  language: 'vi' | 'en'
  onBack: () => void
  onCallInitiated: (callData: any) => void
}

interface FormData {
  name: string
  phone: string
  email: string
  topic: string
  language: 'vi' | 'en'
  preferredTime: string
}

export default function PhoneWidget({
  language,
  onBack,
  onCallInitiated
}: PhoneWidgetProps) {
  const [formData, setFormData] = useState<FormData>({
    name: '',
    phone: '',
    email: '',
    topic: '',
    language,
    preferredTime: ''
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [callStatus, setCallStatus] = useState<'idle' | 'calling' | 'connected' | 'completed' | 'failed'>('idle')
  const [callSid, setCallSid] = useState<string | null>(null)

  const handleInputChange = (field: keyof FormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const validateForm = (): boolean => {
    const { name, phone, topic } = formData
    return !!(name.trim() && phone.trim() && topic.trim())
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) {
      alert(language === 'vi' 
        ? 'Vui lòng điền đầy đủ thông tin bắt buộc'
        : 'Please fill in all required fields'
      )
      return
    }

    setIsSubmitting(true)
    setCallStatus('calling')

    try {
      const response = await fetch('/api/phone', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })

      if (!response.ok) {
        throw new Error('Failed to initiate call')
      }

      const result = await response.json()
      setCallSid(result.callSid)
      setCallStatus('connected')
      onCallInitiated(result)

      // Poll for call status updates
      pollCallStatus(result.callSid)
    } catch (error) {
      console.error('Call initiation error:', error)
      setCallStatus('failed')
    } finally {
      setIsSubmitting(false)
    }
  }

  const pollCallStatus = (callSid: string) => {
    const interval = setInterval(async () => {
      try {
        const response = await fetch(`/api/phone?callSid=${callSid}`)
        const result = await response.json()
        
        if (result.status === 'completed') {
          setCallStatus('completed')
          clearInterval(interval)
        } else if (result.status === 'failed') {
          setCallStatus('failed')
          clearInterval(interval)
        }
      } catch (error) {
        console.error('Status polling error:', error)
        clearInterval(interval)
      }
    }, 3000)

    // Stop polling after 5 minutes
    setTimeout(() => clearInterval(interval), 300000)
  }

  const getStatusMessage = () => {
    switch (callStatus) {
      case 'calling':
        return language === 'vi' 
          ? 'Đang kết nối cuộc gọi...'
          : 'Connecting call...'
      case 'connected':
        return language === 'vi'
          ? 'Cuộc gọi đang được thực hiện'
          : 'Call in progress'
      case 'completed':
        return language === 'vi'
          ? 'Cuộc gọi đã hoàn thành'
          : 'Call completed'
      case 'failed':
        return language === 'vi'
          ? 'Cuộc gọi thất bại'
          : 'Call failed'
      default:
        return ''
    }
  }

  const getStatusIcon = () => {
    switch (callStatus) {
      case 'calling':
        return <Clock className="w-5 h-5 animate-spin" />
      case 'connected':
        return <PhoneCall className="w-5 h-5" />
      case 'completed':
        return <CheckCircle className="w-5 h-5 text-green-500" />
      case 'failed':
        return <XCircle className="w-5 h-5 text-red-500" />
      default:
        return <Phone className="w-5 h-5" />
    }
  }

  const resetForm = () => {
    setFormData({
      name: '',
      phone: '',
      email: '',
      topic: '',
      language,
      preferredTime: ''
    })
    setCallStatus('idle')
    setCallSid(null)
  }

  if (callStatus !== 'idle') {
    return (
      <div className="max-w-2xl mx-auto p-6">
        <div className="flex items-center mb-6">
          <button
            onClick={onBack}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors mr-4"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-2xl font-bold text-gray-800">
            {language === 'vi' ? 'Trạng thái cuộc gọi' : 'Call Status'}
          </h1>
        </div>

        <div className="bg-white rounded-lg shadow-lg p-8 text-center">
          <div className="mb-6">
            {getStatusIcon()}
          </div>
          
          <h2 className="text-xl font-semibold mb-4">
            {getStatusMessage()}
          </h2>

          {callSid && (
            <p className="text-sm text-gray-500 mb-6">
              {language === 'vi' ? 'Mã cuộc gọi:' : 'Call ID:'} {callSid}
            </p>
          )}

          {callStatus === 'connected' && (
            <div className="mb-6">
              <p className="text-gray-600 mb-2">
                {language === 'vi' 
                  ? 'Vui lòng trả lời điện thoại và nói chuyện với trợ lý AI'
                  : 'Please answer the phone and talk with the AI assistant'
                }
              </p>
              <p className="text-sm text-gray-500">
                {language === 'vi'
                  ? 'Cuộc gọi sẽ tự động kết thúc sau 10 phút'
                  : 'Call will automatically end after 10 minutes'
                }
              </p>
            </div>
          )}

          {(callStatus === 'completed' || callStatus === 'failed') && (
            <div className="space-y-4">
              <button
                onClick={resetForm}
                className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
              >
                {language === 'vi' ? 'Gọi lại' : 'Call Again'}
              </button>
              
              <button
                onClick={onBack}
                className="ml-4 px-6 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors"
              >
                {language === 'vi' ? 'Quay lại' : 'Go Back'}
              </button>
            </div>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto p-6">
      <div className="flex items-center mb-6">
        <button
          onClick={onBack}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors mr-4"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-2xl font-bold text-gray-800">
          {language === 'vi' ? 'Đặt lịch gọi tư vấn' : 'Schedule Consultation Call'}
        </h1>
      </div>

      <div className="bg-white rounded-lg shadow-lg p-8">
        <div className="mb-6 text-center">
          <Phone className="w-16 h-16 mx-auto mb-4 text-blue-600" />
          <h2 className="text-xl font-semibold text-gray-800 mb-2">
            {language === 'vi' ? 'Gọi trực tiếp với AI' : 'Direct Call with AI'}
          </h2>
          <p className="text-gray-600">
            {language === 'vi'
              ? 'Điền thông tin dưới đây và chúng tôi sẽ gọi cho bạn ngay lập tức'
              : 'Fill in the information below and we will call you immediately'
            }
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {language === 'vi' ? 'Họ và tên *' : 'Full Name *'}
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => handleInputChange('name', e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder={language === 'vi' ? 'Nhập họ và tên' : 'Enter your full name'}
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {language === 'vi' ? 'Số điện thoại *' : 'Phone Number *'}
            </label>
            <input
              type="tel"
              value={formData.phone}
              onChange={(e) => handleInputChange('phone', e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder={language === 'vi' ? '+84 123 456 789' : '+1 234 567 890'}
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {language === 'vi' ? 'Email' : 'Email'}
            </label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => handleInputChange('email', e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder={language === 'vi' ? 'email@example.com' : 'email@example.com'}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {language === 'vi' ? 'Chủ đề tư vấn *' : 'Consultation Topic *'}
            </label>
            <select
              value={formData.topic}
              onChange={(e) => handleInputChange('topic', e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            >
              <option value="">
                {language === 'vi' ? 'Chọn chủ đề' : 'Select topic'}
              </option>
              <option value="general">
                {language === 'vi' ? 'Tư vấn tổng quát' : 'General consultation'}
              </option>
              <option value="business">
                {language === 'vi' ? 'Tư vấn kinh doanh' : 'Business consultation'}
              </option>
              <option value="technical">
                {language === 'vi' ? 'Hỗ trợ kỹ thuật' : 'Technical support'}
              </option>
              <option value="other">
                {language === 'vi' ? 'Khác' : 'Other'}
              </option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {language === 'vi' ? 'Ngôn ngữ cuộc gọi' : 'Call Language'}
            </label>
            <div className="flex space-x-4">
              <label className="flex items-center">
                <input
                  type="radio"
                  value="vi"
                  checked={formData.language === 'vi'}
                  onChange={(e) => handleInputChange('language', e.target.value)}
                  className="mr-2"
                />
                <span>Tiếng Việt</span>
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  value="en"
                  checked={formData.language === 'en'}
                  onChange={(e) => handleInputChange('language', e.target.value)}
                  className="mr-2"
                />
                <span>English</span>
              </label>
            </div>
          </div>

          <div className="bg-blue-50 p-4 rounded-lg">
            <h3 className="font-semibold text-blue-800 mb-2">
              {language === 'vi' ? 'Lưu ý quan trọng:' : 'Important Note:'}
            </h3>
            <ul className="text-sm text-blue-700 space-y-1">
              <li>
                {language === 'vi'
                  ? '• Cuộc gọi sẽ được thực hiện trong vòng 30 giây'
                  : '• Call will be initiated within 30 seconds'
                }
              </li>
              <li>
                {language === 'vi'
                  ? '• Đảm bảo điện thoại của bạn có thể nhận cuộc gọi'
                  : '• Ensure your phone can receive calls'
                }
              </li>
              <li>
                {language === 'vi'
                  ? '• Cuộc gọi có thể kéo dài tối đa 10 phút'
                  : '• Call duration is limited to 10 minutes'
                }
              </li>
            </ul>
          </div>

          <button
            type="submit"
            disabled={!validateForm() || isSubmitting}
            className="w-full flex items-center justify-center space-x-2 px-6 py-3 bg-green-600 hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
          >
            {isSubmitting ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <Phone className="w-5 h-5" />
            )}
            <span>
              {isSubmitting
                ? (language === 'vi' ? 'Đang kết nối...' : 'Connecting...')
                : (language === 'vi' ? 'Gọi ngay' : 'Call Now')
              }
            </span>
          </button>
        </form>
      </div>
    </div>
  )
}
