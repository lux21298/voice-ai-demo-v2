import OpenAI from 'openai'

let openai: OpenAI | null = null

function getOpenAIClient(): OpenAI {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY is not configured')
  }

  if (!openai) {
    openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    })
  }

  return openai
}

function detectLanguage(text: string): 'vi' | 'en' {
  return /[àáảãạăắằẳẵặâấầẩẫậèéẻẽẹêếềểễệìíỉĩịòóỏõọôốồổỗộơớờởỡợùúủũụưứừửữựỳýỷỹỵđ]/i.test(text)
    ? 'vi'
    : 'en'
}

function generateDemoResponse(transcript: string, mcpResults: any[]): { text: string; language: 'vi' | 'en' } {
  const language = detectLanguage(transcript)
  const hasContext = Array.isArray(mcpResults) && mcpResults.length > 0

  if (language === 'vi') {
    return {
      language,
      text: hasContext
        ? 'Đây là phản hồi demo dựa trên thông tin bootcamp hiện có. Bạn có thể hỏi về học phí, thời lượng khóa học, chương trình học hoặc cơ hội nghề nghiệp tại Australia.'
        : 'Đây là chế độ demo vì OPENAI_API_KEY chưa được cấu hình. Hãy thêm API key vào .env.local để bật ghi âm, chuyển giọng nói thành văn bản và phản hồi bằng AI thật.',
    }
  }

  return {
    language,
    text: hasContext
      ? 'This is a demo response based on the available bootcamp information. You can ask about tuition, program duration, curriculum, or career outcomes in Australia.'
      : 'This is demo mode because OPENAI_API_KEY is not configured. Add your API key to .env.local to enable real transcription, AI responses, and text-to-speech.',
  }
}

export async function transcribeAudio(audioBlob: Blob): Promise<string> {
  try {
    const client = getOpenAIClient()
    const response = await client.audio.transcriptions.create({
      file: audioBlob as any,
      model: 'whisper-1',
    })

    return response.text.trim()
  } catch (error) {
    console.error('Transcription error:', error)
    throw new Error('Failed to transcribe audio')
  }
}

export async function generateResponse(
  transcript: string,
  mcpResults: any[]
): Promise<{ text: string; language: 'vi' | 'en' }> {
  try {
    const language = detectLanguage(transcript)

    if (!process.env.OPENAI_API_KEY) {
      return generateDemoResponse(transcript, mcpResults)
    }

    const context = mcpResults.length > 0
      ? `Context from bootcamp information: ${JSON.stringify(mcpResults, null, 2)}`
      : 'No specific bootcamp information found. Please provide a general helpful response.'

    const systemPrompt = language === 'vi'
      ? 'Bạn là trợ lý AI cho bootcamp lập trình tại Australia. Trả lời câu hỏi bằng tiếng Việt một cách ngắn gọn và hữu ích. Luôn sử dụng tiền tệ AUD và thông tin chính xác về Australia. Nếu có thông tin từ context, hãy sử dụng. Nếu không có thông tin cụ thể, hãy đưa ra câu trả lời chung và gợi ý liên hệ để biết thêm chi tiết.'
      : 'You are an AI assistant for a programming bootcamp located in Australia. Answer questions in English concisely and helpfully. Always use AUD currency and accurate Australian information. If you have context information, use it. If not, provide general helpful answers and suggest contacting for more details.'

    const client = getOpenAIClient()
    const response = await client.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `Context: ${context}\n\nQuestion: ${transcript}` },
      ],
      max_tokens: 150,
      temperature: 0.7,
    })

    const responseText = response.choices[0]?.message?.content?.trim() || 'Sorry, I could not generate a response.'

    return {
      text: responseText,
      language,
    }
  } catch (error) {
    console.error('Response generation error:', error)
    throw new Error('Failed to generate response')
  }
}

export async function textToSpeech(text: string, language: 'vi' | 'en'): Promise<string> {
  try {
    if (!process.env.OPENAI_API_KEY) {
      return ''
    }

    const voice = language === 'vi' ? 'nova' : 'alloy'
    const client = getOpenAIClient()
    const response = await client.audio.speech.create({
      model: 'tts-1',
      voice,
      input: text,
    })

    const arrayBuffer = await response.arrayBuffer()
    const base64 = Buffer.from(arrayBuffer).toString('base64')

    return `data:audio/mpeg;base64,${base64}`
  } catch (error) {
    console.error('Text-to-speech error:', error)
    throw new Error('Failed to convert text to speech')
  }
}
