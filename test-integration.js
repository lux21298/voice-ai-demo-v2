/**
 * Voice AI Demo V2 - Integration Test Suite
 * Tests all major components and services
 */

const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m'
}

function log(message, color = colors.reset) {
  console.log(`${color}${message}${colors.reset}`)
}

function success(message) {
  log(`✅ ${message}`, colors.green)
}

function error(message) {
  log(`❌ ${message}`, colors.red)
}

function warning(message) {
  log(`⚠️  ${message}`, colors.yellow)
}

function info(message) {
  log(`ℹ️  ${message}`, colors.blue)
}

async function testEnvironmentConfig() {
  info('Testing Environment Configuration...')
  
  try {
    // Test if environment variables are accessible
    const openaiKey = process.env.OPENAI_API_KEY
    const redisUrl = process.env.UPSTASH_REDIS_REST_URL
    const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN
    
    if (openaiKey) {
      success(`OpenAI API key configured: ${openaiKey.substring(0, 10)}...`)
    } else {
      error('OpenAI API key not configured in environment')
    }
    
    if (redisUrl && redisToken) {
      success('Redis configuration found')
    } else {
      error('Redis configuration missing')
    }
    
    if (process.env.NEXT_PUBLIC_APP_URL) {
      success(`App URL configured: ${process.env.NEXT_PUBLIC_APP_URL}`)
    } else {
      warning('App URL not configured')
    }
    
    return !!(openaiKey && redisUrl && redisToken)
  } catch (err) {
    error(`Environment test failed: ${err.message}`)
    return false
  }
}

async function testAPIEndpoints() {
  info('Testing API Endpoints...')
  
  try {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3001'
    
    // Test voice API GET
    const voiceResponse = await fetch(`${baseUrl}/api/voice`)
    if (voiceResponse.ok) {
      const data = await voiceResponse.json()
      success(`Voice API endpoint accessible: ${data.message}`)
    } else {
      error(`Voice API returned ${voiceResponse.status}`)
      return false
    }
    
    // Test MCP API
    try {
      const mcpResponse = await fetch(`${baseUrl}/api/mcp`)
      if (mcpResponse.ok) {
        success('MCP API endpoint accessible')
      } else {
        warning(`MCP API returned ${mcpResponse.status} (this may be expected)`)
      }
    } catch (mcpErr) {
      warning('MCP API endpoint test failed (this may be expected)')
    }
    
    // Test analytics API
    try {
      const analyticsResponse = await fetch(`${baseUrl}/api/analytics`)
      if (analyticsResponse.ok) {
        success('Analytics API endpoint accessible')
      } else {
        warning(`Analytics API returned ${analyticsResponse.status}`)
      }
    } catch (analyticsErr) {
      warning('Analytics API endpoint test failed')
    }
    
    return true
  } catch (err) {
    error(`API endpoint test failed: ${err.message}`)
    return false
  }
}

async function testDependencies() {
  info('Testing Dependencies...')
  
  try {
    // Test if required packages can be imported
    const requiredModules = [
      'next',
      'react',
      'openai',
      '@upstash/redis',
      'socket.io',
      'twilio'
    ]
    
    let allDepsAvailable = true
    
    for (const moduleName of requiredModules) {
      try {
        require.resolve(moduleName)
        success(`✓ ${moduleName}`)
      } catch (moduleErr) {
        error(`✗ ${moduleName} - not found`)
        allDepsAvailable = false
      }
    }
    
    return allDepsAvailable
  } catch (err) {
    error(`Dependency test failed: ${err.message}`)
    return false
  }
}

async function testRedisConnection() {
  info('Testing Redis Connection...')
  
  try {
    const redisUrl = process.env.UPSTASH_REDIS_REST_URL
    const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN
    
    if (!redisUrl || !redisToken) {
      error('Redis credentials not available')
      return false
    }
    
    // Test basic Redis connection via REST API
    const testKey = `test-${Date.now()}`
    const testValue = 'integration-test'
    
    // SET operation
    const setResponse = await fetch(`${redisUrl}/set/${testKey}/${testValue}`, {
      headers: {
        'Authorization': `Bearer ${redisToken}`
      }
    })
    
    if (setResponse.ok) {
      success('Redis SET operation successful')
    } else {
      error(`Redis SET failed: ${setResponse.status}`)
      return false
    }
    
    // GET operation
    const getResponse = await fetch(`${redisUrl}/get/${testKey}`, {
      headers: {
        'Authorization': `Bearer ${redisToken}`
      }
    })
    
    if (getResponse.ok) {
      const data = await getResponse.json()
      if (data.result === testValue) {
        success('Redis GET operation successful')
      } else {
        error('Redis GET value mismatch')
        return false
      }
    } else {
      error(`Redis GET failed: ${getResponse.status}`)
      return false
    }
    
    // Cleanup
    await fetch(`${redisUrl}/del/${testKey}`, {
      headers: {
        'Authorization': `Bearer ${redisToken}`
      }
    })
    
    return true
  } catch (err) {
    error(`Redis connection test failed: ${err.message}`)
    return false
  }
}

async function testOpenAIConnection() {
  info('Testing OpenAI Connection...')
  
  try {
    const openaiKey = process.env.OPENAI_API_KEY
    
    if (!openaiKey) {
      error('OpenAI API key not available')
      return false
    }
    
    // Test simple completion
    const response = await fetch('https://api.openai.com/v1/models', {
      headers: {
        'Authorization': `Bearer ${openaiKey}`,
        'Content-Type': 'application/json'
      }
    })
    
    if (response.ok) {
      success('OpenAI API connection successful')
      return true
    } else {
      error(`OpenAI API failed: ${response.status}`)
      return false
    }
  } catch (err) {
    error(`OpenAI connection test failed: ${err.message}`)
    return false
  }
}

async function runAllTests() {
  log('\n🚀 Starting Voice AI Demo V2 Integration Tests\n', colors.blue)
  
  const testResults = {
    environment: await testEnvironmentConfig(),
    dependencies: await testDependencies(),
    api: await testAPIEndpoints(),
    redis: await testRedisConnection(),
    openai: await testOpenAIConnection()
  }
  
  log('\n📊 Test Results Summary:\n', colors.blue)
  
  let passedTests = 0
  let totalTests = Object.keys(testResults).length
  
  Object.entries(testResults).forEach(([testName, passed]) => {
    if (passed) {
      success(`${testName.toUpperCase()}: PASSED`)
      passedTests++
    } else {
      error(`${testName.toUpperCase()}: FAILED`)
    }
  })
  
  log(`\n🎯 Overall: ${passedTests}/${totalTests} tests passed\n`, colors.blue)
  
  if (passedTests === totalTests) {
    success('🎉 All tests passed! The integration is ready for production.')
  } else {
    warning(`⚠️  ${totalTests - passedTests} test(s) failed. Please check the configuration and dependencies.`)
  }
  
  // Provide specific guidance based on test results
  log('\n📋 Next Steps:\n', colors.blue)
  
  if (!testResults.environment) {
    info('1. Verify .env.local file contains all required API keys')
    info('2. Restart the development server after updating environment')
  }
  
  if (!testResults.dependencies) {
    info('1. Run: npm install')
    info('2. Check package.json for missing dependencies')
  }
  
  if (!testResults.redis) {
    info('1. Verify Upstash Redis credentials in .env.local')
    info('2. Check Redis instance is active and accessible')
  }
  
  if (!testResults.openai) {
    info('1. Verify OpenAI API key is valid')
    info('2. Check OpenAI account has sufficient credits')
  }
  
  return passedTests === totalTests
}

// Run tests
runAllTests().catch(console.error)
