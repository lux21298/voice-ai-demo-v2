'use client'

import { useState } from 'react'
import { ArrowLeft, Calendar, Clock, User, Mail, Phone, CheckCircle } from 'lucide-react'
import { BookingRequest } from '@/lib/types'

interface BookingFlowProps {
  language: 'vi' | 'en'
  sessionId: string | null
  onBack: () => void
  onBookingComplete: (booking: BookingRequest) => void
}

interface BookingForm {
  name: string
  phone: string
  email: string
  serviceType: string
  preferredDate: string
  preferredTime: string
  notes: string
}

export default function BookingFlow({
  language,
  sessionId,
  onBack,
  onBookingComplete
}: BookingFlowProps) {
  const [currentStep, setCurrentStep] = useState(1)
  const [formData, setFormData] = useState<BookingForm>({
    name: '',
    phone: '',
    email: '',
    serviceType: '',
    preferredDate: '',
    preferredTime: '',
    notes: ''
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [bookingComplete, setBookingComplete] = useState(false)

  const handleInputChange = (field: keyof BookingForm, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const validateStep = (step: number): boolean => {
    switch (step) {
      case 1:
        return !!(formData.name && formData.phone && formData.email)
      case 2:
        return !!(formData.serviceType)
      case 3:
        return !!(formData.preferredDate && formData.preferredTime)
      default:
        return true
    }
  }

  const handleNext = () => {
    if (validateStep(currentStep)) {
      setCurrentStep(prev => prev + 1)
    }
  }

  const handlePrevious = () => {
    setCurrentStep(prev => prev - 1)
  }

  const handleSubmit = async () => {
    if (!sessionId) return

    setIsSubmitting(true)
    
    try {
      const booking: BookingRequest = {
        sessionId,
        customerInfo: {
          name: formData.name,
          phone: formData.phone,
          email: formData.email
        },
        serviceType: formData.serviceType,
        preferredDateTime: new Date(`${formData.preferredDate}T${formData.preferredTime}`),
        notes: formData.notes,
        language
      }

      // In a real implementation, you'd send this to your booking API
      await new Promise(resolve => setTimeout(resolve, 2000)) // Simulate API call
      
      setBookingComplete(true)
      onBookingComplete(booking)
    } catch (error) {
      console.error('Booking error:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const getMinDate = () => {
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    return tomorrow.toISOString().split('T')[0]
  }

  const getMaxDate = () => {
    const maxDate = new Date()
    maxDate.setDate(maxDate.getDate() + 30)
    return maxDate.toISOString().split('T')[0]
  }

  const generateTimeSlots = () => {
    const slots = []
    for (let hour = 9; hour <= 17; hour++) {
      for (let minute = 0; minute < 60; minute += 30) {
        const timeString = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`
        slots.push(timeString)
      }
    }
    return slots
  }

  if (bookingComplete) {
    return (
      <div className="max-w-2xl mx-auto p-6">
        <div className="bg-white rounded-lg shadow-lg p-8 text-center">
          <CheckCircle className="w-16 h-16 mx-auto mb-4 text-green-500" />
          
          <h2 className="text-2xl font-bold text-gray-800 mb-4">
            {language === 'vi' ? 'Đặt lịch thành công!' : 'Booking Successful!'}
          </h2>
          
          <div className="bg-green-50 p-6 rounded-lg mb-6 text-left">
            <h3 className="font-semibold text-green-800 mb-3">
              {language === 'vi' ? 'Thông tin đặt lịch:' : 'Booking Details:'}
            </h3>
            
            <div className="space-y-2 text-sm">
              <p><strong>{language === 'vi' ? 'Tên:' : 'Name:'}</strong> {formData.name}</p>
              <p><strong>{language === 'vi' ? 'Điện thoại:' : 'Phone:'}</strong> {formData.phone}</p>
              <p><strong>Email:</strong> {formData.email}</p>
              <p><strong>{language === 'vi' ? 'Dịch vụ:' : 'Service:'}</strong> {formData.serviceType}</p>
              <p><strong>{language === 'vi' ? 'Ngày:' : 'Date:'}</strong> {formData.preferredDate}</p>
              <p><strong>{language === 'vi' ? 'Giờ:' : 'Time:'}</strong> {formData.preferredTime}</p>
              {formData.notes && (
                <p><strong>{language === 'vi' ? 'Ghi chú:' : 'Notes:'}</strong> {formData.notes}</p>
              )}
            </div>
          </div>
          
          <div className="text-sm text-gray-600 mb-6">
            <p>
              {language === 'vi'
                ? 'Chúng tôi sẽ liên hệ với bạn trong vòng 24 giờ để xác nhận lịch hẹn.'
                : 'We will contact you within 24 hours to confirm your appointment.'
              }
            </p>
            <p className="mt-2">
              {language === 'vi'
                ? 'Email xác nhận đã được gửi đến hộp thư của bạn.'
                : 'A confirmation email has been sent to your inbox.'
              }
            </p>
          </div>
          
          <button
            onClick={onBack}
            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
          >
            {language === 'vi' ? 'Quay lại trang chủ' : 'Back to Home'}
          </button>
        </div>
      </div>
    )
  }

  const renderStep1 = () => (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <User className="w-12 h-12 mx-auto mb-4 text-blue-600" />
        <h2 className="text-xl font-semibold">
          {language === 'vi' ? 'Thông tin liên hệ' : 'Contact Information'}
        </h2>
        <p className="text-gray-600">
          {language === 'vi' 
            ? 'Vui lòng cung cấp thông tin để chúng tôi liên hệ với bạn'
            : 'Please provide your contact information'
          }
        </p>
      </div>

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
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Email *
        </label>
        <input
          type="email"
          value={formData.email}
          onChange={(e) => handleInputChange('email', e.target.value)}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="email@example.com"
        />
      </div>
    </div>
  )

  const renderStep2 = () => (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <div className="w-12 h-12 mx-auto mb-4 bg-blue-100 rounded-full flex items-center justify-center">
          <span className="text-blue-600 font-semibold">🎯</span>
        </div>
        <h2 className="text-xl font-semibold">
          {language === 'vi' ? 'Chọn dịch vụ' : 'Select Service'}
        </h2>
        <p className="text-gray-600">
          {language === 'vi' 
            ? 'Bạn muốn tư vấn về lĩnh vực nào?'
            : 'What would you like consultation about?'
          }
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {[
          { 
            id: 'business', 
            title: language === 'vi' ? 'Tư vấn kinh doanh' : 'Business Consulting',
            desc: language === 'vi' ? 'Chiến lược, kế hoạch kinh doanh' : 'Strategy, business planning'
          },
          { 
            id: 'technology', 
            title: language === 'vi' ? 'Tư vấn công nghệ' : 'Technology Consulting',
            desc: language === 'vi' ? 'Giải pháp IT, chuyển đổi số' : 'IT solutions, digital transformation'
          },
          { 
            id: 'marketing', 
            title: language === 'vi' ? 'Tư vấn marketing' : 'Marketing Consulting',
            desc: language === 'vi' ? 'Chiến lược marketing, branding' : 'Marketing strategy, branding'
          },
          { 
            id: 'finance', 
            title: language === 'vi' ? 'Tư vấn tài chính' : 'Financial Consulting',
            desc: language === 'vi' ? 'Quản lý tài chính, đầu tư' : 'Financial management, investment'
          }
        ].map((service) => (
          <button
            key={service.id}
            onClick={() => handleInputChange('serviceType', service.id)}
            className={`p-4 text-left border-2 rounded-lg transition-colors ${
              formData.serviceType === service.id
                ? 'border-blue-500 bg-blue-50'
                : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            <h3 className="font-semibold mb-2">{service.title}</h3>
            <p className="text-sm text-gray-600">{service.desc}</p>
          </button>
        ))}
      </div>
    </div>
  )

  const renderStep3 = () => (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <Calendar className="w-12 h-12 mx-auto mb-4 text-blue-600" />
        <h2 className="text-xl font-semibold">
          {language === 'vi' ? 'Chọn thời gian' : 'Select Time'}
        </h2>
        <p className="text-gray-600">
          {language === 'vi' 
            ? 'Chọn ngày và giờ phù hợp cho buổi tư vấn'
            : 'Choose a suitable date and time for consultation'
          }
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {language === 'vi' ? 'Ngày *' : 'Date *'}
          </label>
          <input
            type="date"
            value={formData.preferredDate}
            onChange={(e) => handleInputChange('preferredDate', e.target.value)}
            min={getMinDate()}
            max={getMaxDate()}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {language === 'vi' ? 'Giờ *' : 'Time *'}
          </label>
          <select
            value={formData.preferredTime}
            onChange={(e) => handleInputChange('preferredTime', e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">
              {language === 'vi' ? 'Chọn giờ' : 'Select time'}
            </option>
            {generateTimeSlots().map(time => (
              <option key={time} value={time}>{time}</option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          {language === 'vi' ? 'Ghi chú thêm' : 'Additional Notes'}
        </label>
        <textarea
          value={formData.notes}
          onChange={(e) => handleInputChange('notes', e.target.value)}
          rows={4}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder={language === 'vi' 
            ? 'Mô tả chi tiết về vấn đề bạn muốn tư vấn...'
            : 'Describe the specific issues you need consultation about...'
          }
        />
      </div>

      <div className="bg-yellow-50 p-4 rounded-lg">
        <h3 className="font-semibold text-yellow-800 mb-2">
          {language === 'vi' ? 'Lưu ý:' : 'Note:'}
        </h3>
        <ul className="text-sm text-yellow-700 space-y-1">
          <li>
            {language === 'vi'
              ? '• Buổi tư vấn kéo dài 30-60 phút'
              : '• Consultation session lasts 30-60 minutes'
            }
          </li>
          <li>
            {language === 'vi'
              ? '• Có thể thực hiện qua video call hoặc trực tiếp'
              : '• Can be conducted via video call or in-person'
            }
          </li>
          <li>
            {language === 'vi'
              ? '• Chúng tôi sẽ gửi link meeting trước 24h'
              : '• Meeting link will be sent 24 hours in advance'
            }
          </li>
        </ul>
      </div>
    </div>
  )

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
          {language === 'vi' ? 'Đặt lịch tư vấn' : 'Book Consultation'}
        </h1>
      </div>

      {/* Progress Steps */}
      <div className="mb-8">
        <div className="flex items-center">
          {[1, 2, 3].map((step) => (
            <div key={step} className="flex items-center">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold ${
                step <= currentStep 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-gray-200 text-gray-600'
              }`}>
                {step}
              </div>
              {step < 3 && (
                <div className={`h-1 w-16 mx-2 ${
                  step < currentStep ? 'bg-blue-600' : 'bg-gray-200'
                }`} />
              )}
            </div>
          ))}
        </div>
        
        <div className="flex justify-between mt-2 text-sm text-gray-600">
          <span>{language === 'vi' ? 'Thông tin' : 'Information'}</span>
          <span>{language === 'vi' ? 'Dịch vụ' : 'Service'}</span>
          <span>{language === 'vi' ? 'Thời gian' : 'Time'}</span>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-lg p-8">
        {currentStep === 1 && renderStep1()}
        {currentStep === 2 && renderStep2()}
        {currentStep === 3 && renderStep3()}

        {/* Navigation Buttons */}
        <div className="flex justify-between mt-8">
          <button
            onClick={handlePrevious}
            disabled={currentStep === 1}
            className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {language === 'vi' ? 'Quay lại' : 'Previous'}
          </button>

          {currentStep < 3 ? (
            <button
              onClick={handleNext}
              disabled={!validateStep(currentStep)}
              className="px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
            >
              {language === 'vi' ? 'Tiếp tục' : 'Next'}
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={!validateStep(currentStep) || isSubmitting}
              className="flex items-center space-x-2 px-6 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
            >
              {isSubmitting && (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              )}
              <span>
                {isSubmitting
                  ? (language === 'vi' ? 'Đang xử lý...' : 'Processing...')
                  : (language === 'vi' ? 'Đặt lịch' : 'Book Now')
                }
              </span>
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
