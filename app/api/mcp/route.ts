import { NextRequest, NextResponse } from 'next/server'

type MockResult = {
  title: string
  content: string
  type: 'pricing' | 'schedule' | 'curriculum' | 'career' | 'general'
}

const bootcampKnowledge: MockResult[] = [
  {
    title: 'Tuition Information',
    content: 'Học phí bootcamp tại Australia là AUD $15,000 cho khóa học 16 tuần. Có thể trả góp 3 kỳ, mỗi kỳ AUD $5,000. / The bootcamp tuition in Australia is AUD $15,000 for 16 weeks, payable in 3 installments of AUD $5,000 each.',
    type: 'pricing',
  },
  {
    title: 'Program Duration',
    content: 'Bootcamp kéo dài 16 tuần theo múi giờ Australia. Lịch học full-time từ thứ Hai đến thứ Sáu. / The bootcamp lasts 16 weeks in an Australian timezone, full-time Monday to Friday.',
    type: 'schedule',
  },
  {
    title: 'Curriculum',
    content: 'Chương trình bao gồm Frontend, Backend, Database, deployment và dự án thực tế với công ty Australia. / Curriculum includes frontend, backend, databases, deployment, and real projects with Australian companies.',
    type: 'curriculum',
  },
  {
    title: 'Career Outcomes',
    content: 'Tỷ lệ hỗ trợ việc làm mục tiêu là 85%, với lương khởi điểm tham khảo AUD $60,000-80,000 tùy năng lực và thị trường. / Target job support rate is 85%, with indicative entry salaries around AUD $60,000-80,000 depending on skill and market conditions.',
    type: 'career',
  },
]

function searchMockKnowledge(query: string): MockResult[] {
  const normalizedQuery = query.toLowerCase()

  if (normalizedQuery.includes('học phí') || normalizedQuery.includes('tuition') || normalizedQuery.includes('price')) {
    return bootcampKnowledge.filter((item) => item.type === 'pricing')
  }

  if (normalizedQuery.includes('thời gian') || normalizedQuery.includes('duration') || normalizedQuery.includes('schedule')) {
    return bootcampKnowledge.filter((item) => item.type === 'schedule')
  }

  if (normalizedQuery.includes('chương trình') || normalizedQuery.includes('curriculum') || normalizedQuery.includes('learn')) {
    return bootcampKnowledge.filter((item) => item.type === 'curriculum')
  }

  if (normalizedQuery.includes('job') || normalizedQuery.includes('career') || normalizedQuery.includes('việc làm')) {
    return bootcampKnowledge.filter((item) => item.type === 'career')
  }

  return [
    {
      title: 'General Information',
      content: 'Bootcamp lập trình full-stack 16 tuần tại Australia. Học phí AUD $15,000, có hỗ trợ trả góp và định hướng nghề nghiệp. / A 16-week full-stack programming bootcamp in Australia with AUD $15,000 tuition, installment options, and career support.',
      type: 'general',
    },
  ]
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { method, params } = body

    if (method !== 'search_bootcamp_content') {
      return NextResponse.json(
        {
          success: false,
          error: `Unsupported MCP method: ${method || 'unknown'}`,
        },
        { status: 400 }
      )
    }

    const query = String(params?.query || '')
    const mockResults = searchMockKnowledge(query)

    return NextResponse.json({
      success: true,
      data: mockResults,
      results: mockResults,
    })
  } catch (error) {
    console.error('MCP proxy error:', error)

    return NextResponse.json(
      {
        success: false,
        error: 'MCP proxy error',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'MCP mock proxy is working',
    available_methods: ['search_bootcamp_content'],
    note: 'This endpoint uses local mock data. Replace it with a real MCP server when available.',
  })
}
