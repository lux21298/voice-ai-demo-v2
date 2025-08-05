'use client'

import { useState, useEffect } from 'react'
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

interface AnalyticsData {
  metrics: {
    totalConversations: number
    totalMessages: number
    averageDuration: number
    languageDistribution: Record<string, number>
    popularTopics: Array<{ topic: string; count: number }>
    errorRate: number
    apiCosts: number
    userSatisfaction: number
  }
  dailyStats: Array<{
    date: string
    conversations: number
    messages: number
    duration: number
    cost: number
    errors: number
  }>
  realtime: {
    activeConversations: number
    todayConversations: number
    todayBookings: number
    todayCalls: number
    currentCost: number
  }
}

export default function AnalyticsDashboard() {
  const [data, setData] = useState<AnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [timeRange, setTimeRange] = useState(30)
  const [language, setLanguage] = useState<'vi' | 'en'>('vi')

  useEffect(() => {
    fetchAnalytics()
  }, [timeRange])

  const fetchAnalytics = async () => {
    setLoading(true)
    try {
      const response = await fetch(`/api/analytics?days=${timeRange}`)
      if (response.ok) {
        const analyticsData = await response.json()
        setData(analyticsData)
      }
    } catch (error) {
      console.error('Failed to fetch analytics:', error)
    } finally {
      setLoading(false)
    }
  }

  const exportData = async (format: 'json' | 'csv') => {
    try {
      const response = await fetch('/api/analytics', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ format, days: timeRange })
      })

      if (response.ok) {
        const blob = await response.blob()
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `analytics-${new Date().toISOString().split('T')[0]}.${format}`
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        URL.revokeObjectURL(url)
      }
    } catch (error) {
      console.error('Export failed:', error)
    }
  }

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-24 bg-gray-200 rounded"></div>
            ))}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-64 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="max-w-7xl mx-auto p-6 text-center">
        <p className="text-gray-500">
          {language === 'vi' ? 'Không thể tải dữ liệu phân tích' : 'Failed to load analytics data'}
        </p>
      </div>
    )
  }

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8']

  // Prepare data for charts
  const languageData = Object.entries(data.metrics.languageDistribution).map(([lang, count]) => ({
    name: lang === 'vi' ? 'Tiếng Việt' : 'English',
    value: count
  }))

  const topicsData = data.metrics.popularTopics.map(topic => ({
    name: topic.topic,
    count: topic.count
  }))

  const trendsData = data.dailyStats.map(stat => ({
    date: new Date(stat.date).toLocaleDateString(),
    conversations: stat.conversations,
    cost: stat.cost,
    errors: stat.errors
  }))

  return (
    <div className="max-w-7xl mx-auto p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            {language === 'vi' ? 'Bảng điều khiển Analytics' : 'Analytics Dashboard'}
          </h1>
          <p className="text-gray-600 mt-2">
            {language === 'vi' ? 'Theo dõi hiệu suất hệ thống Voice AI' : 'Monitor Voice AI system performance'}
          </p>
        </div>

        <div className="flex items-center space-x-4">
          {/* Language Toggle */}
          <div className="flex bg-gray-200 rounded-lg p-1">
            <button
              onClick={() => setLanguage('vi')}
              className={`px-3 py-1 rounded transition-colors ${
                language === 'vi' 
                  ? 'bg-white text-blue-600 shadow-sm' 
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              Tiếng Việt
            </button>
            <button
              onClick={() => setLanguage('en')}
              className={`px-3 py-1 rounded transition-colors ${
                language === 'en' 
                  ? 'bg-white text-blue-600 shadow-sm' 
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              English
            </button>
          </div>

          {/* Time Range Selector */}
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(Number(e.target.value))}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value={7}>
              {language === 'vi' ? '7 ngày qua' : 'Last 7 days'}
            </option>
            <option value={30}>
              {language === 'vi' ? '30 ngày qua' : 'Last 30 days'}
            </option>
            <option value={90}>
              {language === 'vi' ? '90 ngày qua' : 'Last 90 days'}
            </option>
          </select>

          {/* Export Buttons */}
          <button
            onClick={() => exportData('json')}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
          >
            {language === 'vi' ? 'Xuất JSON' : 'Export JSON'}
          </button>
          
          <button
            onClick={() => exportData('csv')}
            className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
          >
            {language === 'vi' ? 'Xuất CSV' : 'Export CSV'}
          </button>
        </div>
      </div>

      {/* Real-time Stats */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-6 mb-8">
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-sm font-medium text-gray-500">
            {language === 'vi' ? 'Cuộc trò chuyện hôm nay' : 'Today\'s Conversations'}
          </h3>
          <p className="text-2xl font-bold text-blue-600">{data.realtime.todayConversations}</p>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-sm font-medium text-gray-500">
            {language === 'vi' ? 'Đặt lịch hôm nay' : 'Today\'s Bookings'}
          </h3>
          <p className="text-2xl font-bold text-green-600">{data.realtime.todayBookings}</p>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-sm font-medium text-gray-500">
            {language === 'vi' ? 'Cuộc gọi hôm nay' : 'Today\'s Calls'}
          </h3>
          <p className="text-2xl font-bold text-purple-600">{data.realtime.todayCalls}</p>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-sm font-medium text-gray-500">
            {language === 'vi' ? 'Chi phí hôm nay' : 'Today\'s Cost'}
          </h3>
          <p className="text-2xl font-bold text-red-600">${data.realtime.currentCost.toFixed(2)}</p>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-sm font-medium text-gray-500">
            {language === 'vi' ? 'Tỷ lệ lỗi' : 'Error Rate'}
          </h3>
          <p className="text-2xl font-bold text-yellow-600">{data.metrics.errorRate.toFixed(1)}%</p>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Conversations Trend */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold mb-4">
            {language === 'vi' ? 'Xu hướng cuộc trò chuyện' : 'Conversations Trend'}
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={trendsData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Line type="monotone" dataKey="conversations" stroke="#0088FE" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Language Distribution */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold mb-4">
            {language === 'vi' ? 'Phân bố ngôn ngữ' : 'Language Distribution'}
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={languageData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {languageData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Popular Topics */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold mb-4">
            {language === 'vi' ? 'Chủ đề phổ biến' : 'Popular Topics'}
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={topicsData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="count" fill="#00C49F" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Cost Trend */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold mb-4">
            {language === 'vi' ? 'Xu hướng chi phí' : 'Cost Trend'}
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={trendsData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip formatter={(value) => `$${value}`} />
              <Line type="monotone" dataKey="cost" stroke="#FF8042" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold mb-4">
            {language === 'vi' ? 'Tổng quan' : 'Overview'}
          </h3>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-600">
                {language === 'vi' ? 'Tổng cuộc trò chuyện:' : 'Total Conversations:'}
              </span>
              <span className="font-semibold">{data.metrics.totalConversations}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">
                {language === 'vi' ? 'Tổng tin nhắn:' : 'Total Messages:'}
              </span>
              <span className="font-semibold">{data.metrics.totalMessages}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">
                {language === 'vi' ? 'Thời gian TB:' : 'Avg Duration:'}
              </span>
              <span className="font-semibold">{Math.round(data.metrics.averageDuration)}s</span>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold mb-4">
            {language === 'vi' ? 'Hiệu suất' : 'Performance'}
          </h3>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-600">
                {language === 'vi' ? 'Tỷ lệ lỗi:' : 'Error Rate:'}
              </span>
              <span className="font-semibold text-red-600">{data.metrics.errorRate.toFixed(1)}%</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">
                {language === 'vi' ? 'Đánh giá:' : 'User Rating:'}
              </span>
              <span className="font-semibold text-green-600">{data.metrics.userSatisfaction.toFixed(1)}/5</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">
                {language === 'vi' ? 'Độ tin cậy:' : 'Reliability:'}
              </span>
              <span className="font-semibold text-blue-600">
                {(100 - data.metrics.errorRate).toFixed(1)}%
              </span>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold mb-4">
            {language === 'vi' ? 'Chi phí' : 'Costs'}
          </h3>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-600">
                {language === 'vi' ? 'Tổng chi phí:' : 'Total Cost:'}
              </span>
              <span className="font-semibold">${data.metrics.apiCosts.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">
                {language === 'vi' ? 'Chi phí/cuộc trò chuyện:' : 'Cost per Conversation:'}
              </span>
              <span className="font-semibold">
                ${data.metrics.totalConversations > 0 
                  ? (data.metrics.apiCosts / data.metrics.totalConversations).toFixed(3)
                  : '0.000'
                }
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">
                {language === 'vi' ? 'Hôm nay:' : 'Today:'}
              </span>
              <span className="font-semibold">${data.realtime.currentCost.toFixed(2)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
