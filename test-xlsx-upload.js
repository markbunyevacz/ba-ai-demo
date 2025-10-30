#!/usr/bin/env node

/**
 * XLSX Upload Test Script
 * 
 * This script tests the /api/upload/document endpoint to identify issues
 * related to "Unexpected end of JSON input" errors.
 * 
 * Usage:
 *   node test-xlsx-upload.js
 */

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// Configuration
// Default to Python backend (port 8000), fallback to JavaScript backend (port 5000)
const SERVER_URL = process.env.SERVER_URL || 'http://localhost:8000'
const TEST_FILES_DIR = path.join(__dirname, 'docs')

// Color codes for console output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
}

const log = {
  info: (msg) => console.log(`${colors.blue}ℹ${colors.reset} ${msg}`),
  success: (msg) => console.log(`${colors.green}✓${colors.reset} ${msg}`),
  error: (msg) => console.log(`${colors.red}✗${colors.reset} ${msg}`),
  warn: (msg) => console.log(`${colors.yellow}⚠${colors.reset} ${msg}`),
  section: (msg) => console.log(`\n${colors.cyan}=== ${msg} ===${colors.reset}\n`)
}

/**
 * Test 1: Server Connectivity
 */
async function testServerConnectivity() {
  log.section('Test 1: Server Connectivity')
  
  try {
    log.info(`Checking if server is running at ${SERVER_URL}...`)
    const response = await fetch(`${SERVER_URL}/api/health`, {
      timeout: 5000
    })
    const data = await response.json()
    
    if (response.ok) {
      log.success(`Server is running! Status: ${data.status}`)
      log.info(`Server info:`)
      console.log(`  - Uptime: ${data.uptime.toFixed(2)}s`)
      console.log(`  - Timestamp: ${data.timestamp}`)
      return true
    } else {
      log.error(`Server returned status ${response.status}`)
      return false
    }
  } catch (error) {
    log.error(`Server connection failed: ${error.message}`)
    log.warn(`Make sure the backend is running on ${SERVER_URL}`)
    log.warn(`Python backend: cd python-backend && uvicorn main:app --reload --port 8000`)
    log.warn(`JavaScript backend (legacy): npm run server`)
    return false
  }
}

/**
 * Test 2: Test with valid XLSX file
 */
async function testValidXlsx() {
  log.section('Test 2: Valid XLSX Upload')
  
  const testFiles = [
    'demo_simple.xlsx',
    'demo_normal.xlsx',
    'demo_complex.xlsx',
    'demo_data.xlsx'
  ]
  
  for (const filename of testFiles) {
    const filePath = path.join(TEST_FILES_DIR, filename)
    
    if (!fs.existsSync(filePath)) {
      log.warn(`File not found: ${filename}`)
      continue
    }
    
    log.info(`Testing with: ${filename}`)
    
    try {
      const fileBuffer = fs.readFileSync(filePath)
      const formData = new FormData()
      const blob = new Blob([fileBuffer], { 
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
      })
      formData.append('file', blob, filename)
      
      const response = await fetch(`${SERVER_URL}/api/upload/document`, {
        method: 'POST',
        body: formData,
        timeout: 10000
      })
      
      // Test content-type header
      const contentType = response.headers.get('content-type')
      if (!contentType || !contentType.includes('application/json')) {
        log.error(`Invalid content-type: ${contentType || 'missing'}`)
      }
      
      // Test JSON parsing
      let data
      try {
        const text = await response.text()
        if (!text) {
          log.error(`Empty response body`)
          continue
        }
        data = JSON.parse(text)
      } catch (parseError) {
        log.error(`JSON parse error: ${parseError.message}`)
        log.error(`Response appears to be invalid or non-JSON`)
        continue
      }
      
      if (response.ok) {
        log.success(`Upload successful!`)
        if (data.tickets) {
          log.info(`Generated ${data.tickets.length} tickets`)
          if (data.tickets.length > 0) {
            log.info(`First ticket: ${data.tickets[0].id} - ${data.tickets[0].summary}`)
          }
        }
      } else {
        log.error(`Server error: ${data.error || 'Unknown error'}`)
        if (data.details) {
          log.info(`Details: ${data.details}`)
        }
      }
    } catch (error) {
      if (error.name === 'AbortError' || error.message.includes('timeout')) {
        log.error(`Request timeout - server may be hanging`)
      } else {
        log.error(`Upload failed: ${error.message}`)
      }
    }
    
    console.log()
  }
}

/**
 * Test 3: Test with corrupted file
 */
async function testCorruptedFile() {
  log.section('Test 3: Corrupted File Handling')
  
  log.info('Creating corrupted XLSX file...')
  
  try {
    const corruptedBuffer = Buffer.from('This is not a valid Excel file')
    const formData = new FormData()
    const blob = new Blob([corruptedBuffer], { 
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
    })
    formData.append('file', blob, 'corrupted.xlsx')
    
    const response = await fetch(`${SERVER_URL}/api/upload/document`, {
      method: 'POST',
      body: formData,
      timeout: 10000
    })
    
    const contentType = response.headers.get('content-type')
    if (!contentType || !contentType.includes('application/json')) {
      log.error(`Invalid content-type for error response: ${contentType}`)
      return
    }
    
    let data
    try {
      data = await response.json()
    } catch (parseError) {
      log.error(`JSON parse error on error response: ${parseError.message}`)
      return
    }
    
    if (!response.ok) {
      log.success(`Error handled gracefully`)
      log.info(`Error: ${data.error}`)
      if (data.details) {
        log.info(`Details: ${data.details}`)
      }
    } else {
      log.warn(`Expected error response but got success`)
    }
  } catch (error) {
    log.error(`Test failed: ${error.message}`)
  }
}

/**
 * Test 4: Test with invalid file type
 */
async function testInvalidFileType() {
  log.section('Test 4: Invalid File Type Handling')
  
  log.info('Attempting to upload a .txt file (should be rejected)...')
  
  try {
    const textBuffer = Buffer.from('This is a text file')
    const formData = new FormData()
    const blob = new Blob([textBuffer], { type: 'text/plain' })
    formData.append('file', blob, 'test.txt')
    
    const response = await fetch(`${SERVER_URL}/api/upload/document`, {
      method: 'POST',
      body: formData,
      timeout: 10000
    })
    
    const contentType = response.headers.get('content-type')
    if (!contentType || !contentType.includes('application/json')) {
      log.error(`Invalid content-type: ${contentType}`)
      return
    }
    
    let data
    try {
      data = await response.json()
    } catch (parseError) {
      log.error(`JSON parse error: ${parseError.message}`)
      return
    }
    
    if (!response.ok) {
      log.success(`Invalid file type rejected`)
      log.info(`Error: ${data.error}`)
    } else {
      log.error(`Invalid file type was accepted (should be rejected)`)
    }
  } catch (error) {
    log.error(`Test failed: ${error.message}`)
  }
}

/**
 * Test 5: Check monitoring data
 */
async function testMonitoring() {
  log.section('Test 5: Monitoring System')
  
  try {
    log.info('Fetching monitoring metrics...')
    const response = await fetch(`${SERVER_URL}/api/monitoring/metrics`, {
      timeout: 5000
    })
    
    if (response.ok) {
      const data = await response.json()
      log.success('Monitoring system is operational')
      if (data.metrics) {
        console.log(`  - Total requests: ${data.metrics.totalRequests || 0}`)
        console.log(`  - Successful: ${data.metrics.successful || 0}`)
        console.log(`  - Failed: ${data.metrics.failed || 0}`)
      }
    } else {
      log.error(`Monitoring endpoint returned ${response.status}`)
    }
  } catch (error) {
    log.error(`Failed to fetch monitoring data: ${error.message}`)
  }
}

/**
 * Main test runner
 */
async function runAllTests() {
  console.log(`\n${colors.cyan}╔════════════════════════════════════════╗${colors.reset}`)
  console.log(`${colors.cyan}║      XLSX Upload Test Suite            ║${colors.reset}`)
  console.log(`${colors.cyan}╚════════════════════════════════════════╝${colors.reset}\n`)
  
  log.info(`Server URL: ${SERVER_URL}`)
  log.info(`Node version: ${process.version}`)
  
  // Run tests in sequence
  const serverOk = await testServerConnectivity()
  
  if (!serverOk) {
    log.error(`Cannot continue without server connectivity`)
    process.exit(1)
  }
  
  await testValidXlsx()
  await testCorruptedFile()
  await testInvalidFileType()
  await testMonitoring()
  
  console.log(`\n${colors.green}✓ Test suite completed${colors.reset}\n`)
}

// Run tests
runAllTests().catch(error => {
  log.error(`Fatal error: ${error.message}`)
  process.exit(1)
})
