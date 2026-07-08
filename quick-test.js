/**
 * Quick smoke test for a running Voice AI Demo V2 server.
 *
 * Usage:
 *   npm run dev
 *   npm run test:quick
 *
 * Optional:
 *   BASE_URL=http://localhost:3001 npm run test:quick
 */

const baseUrl = process.env.BASE_URL || 'http://localhost:3000'

async function expectOk(label, request) {
  const response = await request()
  if (!response.ok) {
    throw new Error(`${label} failed with HTTP ${response.status}`)
  }
  return response
}

async function runQuickTest() {
  console.log(`Running quick smoke test against ${baseUrl}\n`)

  try {
    const healthCheck = await expectOk('Voice API health check', () => fetch(`${baseUrl}/api/voice`))
    const healthData = await healthCheck.json()
    console.log(`OK voice API: ${healthData.message}`)

    const mcpResponse = await expectOk('MCP mock search', () =>
      fetch(`${baseUrl}/api/mcp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          method: 'search_bootcamp_content',
          params: { query: 'tuition and curriculum' },
        }),
      })
    )
    const mcpData = await mcpResponse.json()
    console.log(`OK MCP mock: ${mcpData.data?.length || 0} result(s)`)

    const analyticsResponse = await expectOk('Analytics endpoint', () => fetch(`${baseUrl}/api/analytics`))
    const analyticsData = await analyticsResponse.json()
    console.log(`OK analytics endpoint: ${analyticsData.period ? 'period returned' : 'response returned'}`)

    console.log('\nQuick test completed successfully.')
  } catch (error) {
    console.error('\nQuick test failed.')
    console.error(error instanceof Error ? error.message : error)
    process.exitCode = 1
  }
}

runQuickTest()
