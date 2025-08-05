import { NextRequest, NextResponse } from 'next/server'
import { analyticsService } from '@/lib/services/analytics.service'

// Get analytics metrics
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const fromParam = searchParams.get('from')
    const toParam = searchParams.get('to')
    const days = searchParams.get('days')

    let dateRange: { from: Date; to: Date } | undefined

    if (fromParam && toParam) {
      dateRange = {
        from: new Date(fromParam),
        to: new Date(toParam)
      }
    }

    // Get comprehensive metrics
    const [metricsResult, dailyStatsResult, realtimeStats] = await Promise.all([
      analyticsService.getMetrics(dateRange),
      analyticsService.getDailyStats(days ? parseInt(days) : 30),
      analyticsService.getRealtimeStats()
    ])

    if (!metricsResult.success) {
      return NextResponse.json(
        { error: metricsResult.error?.message || 'Failed to get metrics' },
        { status: 500 }
      )
    }

    if (!dailyStatsResult.success) {
      return NextResponse.json(
        { error: dailyStatsResult.error?.message || 'Failed to get daily stats' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      metrics: metricsResult.data,
      dailyStats: dailyStatsResult.data,
      realtime: realtimeStats,
      period: {
        from: dateRange?.from || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        to: dateRange?.to || new Date(),
        days: days ? parseInt(days) : 30
      }
    })
  } catch (error) {
    console.error('Analytics GET error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// Track custom analytics event
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { type, sessionId, data, cost } = body

    if (!type || !sessionId) {
      return NextResponse.json(
        { error: 'Event type and session ID are required' },
        { status: 400 }
      )
    }

    const result = await analyticsService.trackEvent({
      type,
      sessionId,
      timestamp: new Date(),
      data: data || {},
      cost
    })

    if (!result.success) {
      return NextResponse.json(
        { error: result.error?.message || 'Failed to track event' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Analytics POST error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// Export analytics data
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { format = 'json', days = 30 } = body

    if (!['json', 'csv'].includes(format)) {
      return NextResponse.json(
        { error: 'Format must be json or csv' },
        { status: 400 }
      )
    }

    const result = await analyticsService.exportData(format, days)

    if (!result.success) {
      return NextResponse.json(
        { error: result.error?.message || 'Failed to export data' },
        { status: 500 }
      )
    }

    const contentType = format === 'csv' ? 'text/csv' : 'application/json'
    const filename = `analytics-${new Date().toISOString().split('T')[0]}.${format}`

    return new Response(result.data, {
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `attachment; filename="${filename}"`
      }
    })
  } catch (error) {
    console.error('Analytics export error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// Clean up old analytics data
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const daysToKeep = searchParams.get('daysToKeep')

    const result = await analyticsService.clearOldData(
      daysToKeep ? parseInt(daysToKeep) : 90
    )

    if (!result.success) {
      return NextResponse.json(
        { error: result.error?.message || 'Failed to clean up data' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      deletedRecords: result.data
    })
  } catch (error) {
    console.error('Analytics cleanup error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
