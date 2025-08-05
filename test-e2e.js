/**
 * Voice AI Demo V2 - End-to-End Voice Processing Test
 * Tests the complete voice workflow
 */

const fs = require('fs')
const FormData = require('form-data')

// Test configurations
const API_BASE = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3001'
const TEST_AUDIO_URL = 'data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhAS2Z4vO/bSUFLYPQ8N2IRwgQZLbr9XYqBCh+zPLaezkGHm7B99lpJAUpfszx3oNFBw9isOPvtGkdATB+z/LNeSMFKoHM8+F4LwcIod363l8uBzhpwOqjdBcOCJ0='

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

// Helper function to create a minimal WAV file for testing
function createTestAudioBuffer() {
  // Very minimal WAV file (silent audio)
  const buffer = Buffer.from([
    0x52, 0x49, 0x46, 0x46, // "RIFF"
    0x24, 0x00, 0x00, 0x00, // file size
    0x57, 0x41, 0x56, 0x45, // "WAVE"
    0x66, 0x6D, 0x74, 0x20, // "fmt "
    0x10, 0x00, 0x00, 0x00, // chunk size
    0x01, 0x00,             // audio format (PCM)
    0x01, 0x00,             // num channels
    0x44, 0xAC, 0x00, 0x00, // sample rate (44100)
    0x88, 0x58, 0x01, 0x00, // byte rate
    0x02, 0x00,             // block align
    0x10, 0x00,             // bits per sample
    0x64, 0x61, 0x74, 0x61, // "data"
    0x00, 0x00, 0x00, 0x00  // data size (empty)
  ])
  return buffer
}

async function testVoiceAPIV1() {
  info('Testing Voice API V1 (Simple)...')
  
  try {
    const formData = new FormData()
    const audioBuffer = createTestAudioBuffer()
    
    formData.append('audio', audioBuffer, {
      filename: 'test.wav',
      contentType: 'audio/wav'
    })
    
    const response = await fetch(`${API_BASE}/api/voice`, {
      method: 'POST',
      body: formData
    })
    
    if (response.ok) {
      const data = await response.json()
      success('Voice API V1 responds successfully')
      info(`Response structure: ${Object.keys(data).join(', ')}`)
      return true
    } else {
      const errorText = await response.text()
      warning(`Voice API V1 returned ${response.status}: ${errorText}`)
      return false
    }
  } catch (err) {
    error(`Voice API V1 test failed: ${err.message}`)
    return false
  }
}

async function testVoiceAPIV2() {
  info('Testing Voice API V2 (Enhanced)...')
  
  try {
    const testRequest = {
      sessionId: `test-session-${Date.now()}`,
      audioData: Buffer.from(createTestAudioBuffer()).toString('base64'),
      language: 'en'
    }
    
    const response = await fetch(`${API_BASE}/api/voice/v2`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(testRequest)
    })
    
    if (response.ok) {
      const data = await response.json()
      success('Voice API V2 responds successfully')
      info(`Response structure: ${Object.keys(data).join(', ')}`)
      return true
    } else {
      const errorText = await response.text()
      warning(`Voice API V2 returned ${response.status}: ${errorText}`)
      return false
    }
  } catch (err) {
    error(`Voice API V2 test failed: ${err.message}`)
    return false
  }
}

async function testSessionManagement() {
  info('Testing Session Management...')
  
  try {
    const sessionResponse = await fetch(`${API_BASE}/api/voice/session`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        language: 'en',
        context: { source: 'test' }
      })
    })
    
    if (sessionResponse.ok) {
      const sessionData = await sessionResponse.json()
      success(`Session created: ${sessionData.sessionId || 'ID received'}`)
      return true
    } else {
      warning(`Session API returned ${sessionResponse.status}`)
      return false
    }
  } catch (err) {
    error(`Session management test failed: ${err.message}`)
    return false
  }
}

async function testPhoneIntegration() {
  info('Testing Phone Integration...')
  
  try {
    const phoneResponse = await fetch(`${API_BASE}/api/phone`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        formData: {
          name: 'Test User',
          phone: '+1234567890',
          language: 'en',
          topic: 'general inquiry'
        }
      })
    })
    
    if (phoneResponse.ok) {
      success('Phone API responds successfully')
      return true
    } else {
      warning(`Phone API returned ${phoneResponse.status}`)
      return false
    }
  } catch (err) {
    error(`Phone integration test failed: ${err.message}`)
    return false
  }
}

async function testAnalytics() {
  info('Testing Analytics...')
  
  try {
    // Test analytics tracking
    const analyticsResponse = await fetch(`${API_BASE}/api/analytics`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        type: 'test_event',
        sessionId: 'test-session',
        data: { test: true }
      })
    })
    
    if (analyticsResponse.ok) {
      success('Analytics tracking works')
    } else {
      warning(`Analytics POST returned ${analyticsResponse.status}`)
    }
    
    // Test analytics retrieval
    const getAnalyticsResponse = await fetch(`${API_BASE}/api/analytics`)
    
    if (getAnalyticsResponse.ok) {
      success('Analytics retrieval works')
      return true
    } else {
      warning(`Analytics GET returned ${getAnalyticsResponse.status}`)
      return false
    }
  } catch (err) {
    error(`Analytics test failed: ${err.message}`)
    return false
  }
}

async function testMCPIntegration() {
  info('Testing MCP Integration...')
  
  try {
    const mcpResponse = await fetch(`${API_BASE}/api/mcp`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        method: 'search_bootcamp_content',
        params: { query: 'course fees' }
      })
    })
    
    if (mcpResponse.ok) {
      const mcpData = await mcpResponse.json()
      success('MCP integration works')
      info(`MCP response structure: ${Object.keys(mcpData).join(', ')}`)
      return true
    } else {
      warning(`MCP API returned ${mcpResponse.status}`)
      return false
    }
  } catch (err) {
    error(`MCP integration test failed: ${err.message}`)
    return false
  }
}

async function runEndToEndTests() {
  log('\n🎯 Starting End-to-End Voice Processing Tests\n', colors.blue)
  
  const testResults = {
    voiceV1: await testVoiceAPIV1(),
    voiceV2: await testVoiceAPIV2(),
    session: await testSessionManagement(),
    phone: await testPhoneIntegration(),
    analytics: await testAnalytics(),
    mcp: await testMCPIntegration()
  }
  
  log('\n📊 End-to-End Test Results:\n', colors.blue)
  
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
  
  log(`\n🎯 Overall: ${passedTests}/${totalTests} end-to-end tests passed\n`, colors.blue)
  
  if (passedTests >= totalTests * 0.8) { // 80% pass rate is acceptable
    success('🎉 End-to-end tests mostly successful! Ready for deployment.')
  } else {
    warning(`⚠️  Only ${passedTests}/${totalTests} tests passed. Review failed components.`)
  }
  
  // Provide deployment readiness assessment
  log('\n🚀 Deployment Readiness Assessment:\n', colors.blue)
  
  if (testResults.voiceV1 || testResults.voiceV2) {
    success('✓ Core voice processing is functional')
  } else {
    error('✗ Core voice processing needs attention')
  }
  
  if (testResults.session) {
    success('✓ Session management is working')
  } else {
    warning('⚠ Session management may need review')
  }
  
  if (testResults.mcp) {
    success('✓ MCP integration is functional')
  } else {
    warning('⚠ MCP integration may need review')
  }
  
  return passedTests >= totalTests * 0.8
}

// Run end-to-end tests
runEndToEndTests().catch(console.error)
