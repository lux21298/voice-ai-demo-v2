import { NextRequest, NextResponse } from 'next/server'
import { phoneService } from '@/lib/services/phone.service'

// Twilio webhook for call events
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const callSid = formData.get('CallSid') as string
    const from = formData.get('From') as string
    const to = formData.get('To') as string
    const callStatus = formData.get('CallStatus') as string
    const direction = formData.get('Direction') as string

    // Validate Twilio signature (in production)
    const signature = request.headers.get('x-twilio-signature') || ''
    const url = request.url
    // Extract form data for signature validation
    const params: Record<string, string> = {}
    const formEntries = Array.from(formData.entries())
    
    for (const [key, value] of formEntries) {
      params[key] = value.toString()
    }

    // Skip validation for demo purposes
    // const isValid = phoneService.validateWebhookSignature(signature, url, params)
    // if (!isValid) {
    //   return new Response('Unauthorized', { status: 401 })
    // }

    console.log('Twilio webhook received:', {
      callSid,
      from,
      to,
      callStatus,
      direction
    })

    let twimlResponse: string

    if (direction === 'inbound') {
      // Handle incoming call
      twimlResponse = await phoneService.handleIncomingCall(callSid, from)
    } else {
      // Handle outbound call status
      await phoneService.handleCallStatus(callSid, callStatus)
      
      // For outbound calls, generate appropriate TwiML based on status
      if (callStatus === 'answered') {
        const { searchParams } = new URL(request.url)
        const sessionId = searchParams.get('sessionId')
        
        if (sessionId) {
          // This would typically get session data to personalize greeting
          twimlResponse = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
    <Say voice="Polly.Joanna" language="vi-VN">
        Xin chào, cảm ơn bạn đã đặt lịch tư vấn. Tôi là trợ lý AI sẽ hỗ trợ bạn hôm nay.
    </Say>
    <Gather action="/api/phone/speech" method="POST" input="speech" language="vi-VN" timeout="5" speechTimeout="auto">
        <Say voice="Polly.Joanna" language="vi-VN">
            Bạn muốn tư vấn về vấn đề gì? Vui lòng nói sau tiếng bíp.
        </Say>
    </Gather>
    <Say voice="Polly.Joanna" language="vi-VN">
        Tôi không nghe thấy gì. Tạm biệt.
    </Say>
    <Hangup/>
</Response>`
        } else {
          twimlResponse = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
    <Say voice="Polly.Joanna" language="vi-VN">
        Xin lỗi, có lỗi hệ thống. Vui lòng thử lại sau.
    </Say>
    <Hangup/>
</Response>`
        }
      } else {
        // For other statuses, just acknowledge
        twimlResponse = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
</Response>`
      }
    }

    return new Response(twimlResponse, {
      headers: { 'Content-Type': 'text/xml' }
    })
  } catch (error) {
    console.error('Twilio webhook error:', error)
    
    // Return error TwiML
    const errorTwiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
    <Say voice="Polly.Joanna" language="vi-VN">
        Xin lỗi, hệ thống gặp sự cố. Vui lòng thử lại sau.
    </Say>
    <Hangup/>
</Response>`

    return new Response(errorTwiml, {
      headers: { 'Content-Type': 'text/xml' },
      status: 500
    })
  }
}

// Handle GET requests (for webhook verification)
export async function GET(request: NextRequest) {
  return NextResponse.json({
    message: 'Twilio webhook endpoint is active',
    timestamp: new Date().toISOString()
  })
}
