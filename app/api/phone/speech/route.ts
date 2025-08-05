import { NextRequest, NextResponse } from 'next/server'
import { phoneService } from '@/lib/services/phone.service'

// Handle speech input from Twilio
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const callSid = formData.get('CallSid') as string
    const speechResult = formData.get('SpeechResult') as string
    const confidence = parseFloat(formData.get('Confidence') as string || '0')

    console.log('Speech input received:', {
      callSid,
      speechResult,
      confidence
    })

    if (!callSid) {
      return new Response('Call SID is required', { status: 400 })
    }

    if (!speechResult || confidence < 0.5) {
      // Low confidence or no speech detected
      const lowConfidenceTwiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
    <Say voice="Polly.Joanna" language="vi-VN">
        Xin lỗi, tôi không nghe rõ. Bạn có thể nói lại không?
    </Say>
    <Gather action="/api/phone/speech" method="POST" input="speech" language="vi-VN" timeout="5" speechTimeout="auto">
        <Say voice="Polly.Joanna" language="vi-VN">
            Vui lòng nói rõ ràng sau tiếng bíp.
        </Say>
    </Gather>
    <Say voice="Polly.Joanna" language="vi-VN">
        Cảm ơn bạn đã gọi. Tạm biệt.
    </Say>
    <Hangup/>
</Response>`

      return new Response(lowConfidenceTwiml, {
        headers: { 'Content-Type': 'text/xml' }
      })
    }

    // Process the speech input
    const twimlResponse = await phoneService.handleSpeechInput(callSid, speechResult, confidence)

    return new Response(twimlResponse, {
      headers: { 'Content-Type': 'text/xml' }
    })
  } catch (error) {
    console.error('Speech handling error:', error)
    
    // Return error TwiML
    const errorTwiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
    <Say voice="Polly.Joanna" language="vi-VN">
        Xin lỗi, có lỗi xảy ra trong quá trình xử lý. Vui lòng thử lại.
    </Say>
    <Gather action="/api/phone/speech" method="POST" input="speech" language="vi-VN" timeout="5" speechTimeout="auto">
        <Say voice="Polly.Joanna" language="vi-VN">
            Bạn có muốn tiếp tục không?
        </Say>
    </Gather>
    <Say voice="Polly.Joanna" language="vi-VN">
        Tạm biệt.
    </Say>
    <Hangup/>
</Response>`

    return new Response(errorTwiml, {
      headers: { 'Content-Type': 'text/xml' },
      status: 500
    })
  }
}

// Handle GET for testing
export async function GET() {
  return NextResponse.json({
    message: 'Speech handling endpoint is active',
    usage: 'POST with Twilio form data containing SpeechResult'
  })
}
