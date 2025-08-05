import { NextRequest, NextResponse } from 'next/server'
import { phoneService } from '@/lib/services/phone.service'

// Initiate outbound call
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, phone, email, language = 'vi', topic, preferredTime } = body

    // Validate required fields
    if (!name || !phone || !topic) {
      return NextResponse.json(
        { error: 'Name, phone, and topic are required' },
        { status: 400 }
      )
    }

    // Validate phone number format (basic validation)
    const phoneRegex = /^[\+]?[1-9][\d]{7,14}$/
    if (!phoneRegex.test(phone.replace(/\s/g, ''))) {
      return NextResponse.json(
        { error: 'Invalid phone number format' },
        { status: 400 }
      )
    }

    const result = await phoneService.initiateCall({
      name,
      phone,
      email,
      language,
      topic,
      preferredTime
    })

    if (!result.success) {
      return NextResponse.json(
        { error: result.error?.message || 'Failed to initiate call' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      callSid: result.data!.callSid,
      status: result.data!.status,
      message: language === 'vi' 
        ? 'Cuộc gọi đang được kết nối. Vui lòng chờ trong giây lát.'
        : 'Call is being connected. Please wait a moment.'
    })
  } catch (error) {
    console.error('Phone initiation error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// Get call status
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const callSid = searchParams.get('callSid')

    if (!callSid) {
      return NextResponse.json(
        { error: 'Call SID is required' },
        { status: 400 }
      )
    }

    // In a real implementation, you'd query Twilio for call status
    // For now, return a mock response
    return NextResponse.json({
      callSid,
      status: 'in-progress',
      duration: 0,
      message: 'Call status retrieved successfully'
    })
  } catch (error) {
    console.error('Phone status error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
