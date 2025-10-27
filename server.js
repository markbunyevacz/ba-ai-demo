import express from 'express'
import cors from 'cors'
import multer from 'multer'
import xlsx from 'xlsx'
import path from 'path'
import { fileURLToPath } from 'url'
import dotenv from 'dotenv'
import GroundingService from './src/services/groundingService.js'
import MonitoringService from './src/services/monitoringService.js'
import JiraService from './src/services/jiraService.js'
import SessionStore from './src/services/sessionStore.js'
import DocumentParser from './src/services/documentParser.js'
import diagramService from './src/services/diagramService.js'

// Load environment variables
dotenv.config()

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const app = express()
const PORT = process.env.PORT || 5000

// Middleware
app.use(cors())
app.use(express.json())

// Serve static files from public directory
app.use(express.static(path.join(__dirname, 'public')))

// Configure multer for memory storage
const upload = multer({ storage: multer.memoryStorage() })

// Configure multer with file type filtering for Excel and Word
const uploadWithFilter = multer({
  storage: multer.memoryStorage(),
  fileFilter: (req, file, cb) => {
    const allowed = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document' // .docx
    ]
    if (allowed.includes(file.mimetype)) {
      cb(null, true)
    } else {
      cb(new Error(`Invalid file type: ${file.mimetype}. Only .xlsx and .docx files are allowed.`))
    }
  }
})

// Priority mapping
const priorityMap = {
  'Kritikus': 'Critical',
  'Magas': 'High',
  'Közepes': 'Medium',
  'Alacsony': 'Low'
}

// Ticket counter - starts from a random number to simulate realistic Jira IDs
let ticketCounter = Math.floor(Math.random() * 900) + 1001 // Random between 1001-1900

// Initialize grounding service
const groundingService = new GroundingService()

// Initialize monitoring service
const monitoringService = new MonitoringService()

// Add session management for OAuth state tracking
const oauthStates = new Map()

// Helper function to generate and store OAuth state
const generateOAuthState = () => {
  const state = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15)
  oauthStates.set(state, {
    createdAt: Date.now(),
    expires: Date.now() + 600000 // 10 minutes
  })
  return state
}

// Helper function to validate OAuth state
const validateOAuthState = (state) => {
  const stateData = oauthStates.get(state)
  if (!stateData) return false
  if (Date.now() > stateData.expires) {
    oauthStates.delete(state)
    return false
  }
  oauthStates.delete(state)
  return true
}

// Routes
app.post('/api/upload', upload.single('file'), (req, res) => {
  // Track request start
  const sessionId = monitoringService.trackRequest({
    endpoint: '/api/upload',
    fileSize: req.file?.size || 0,
    fileName: req.file?.originalname || 'unknown'
  })

  try {
    if (!req.file) {
      monitoringService.trackCompletion(sessionId, { success: false, error: 'No file uploaded' })
      return res.status(400).json({ error: 'No file uploaded' })
    }

    console.log('Parsed Excel data: processing file in memory')

    // Parse Excel from memory buffer
    const workbook = xlsx.read(req.file.buffer, { type: 'buffer', cellText: false, cellDates: true })
    const sheetName = workbook.SheetNames[0]
    const worksheet = workbook.Sheets[sheetName]

    // SAFER PARSING: use array-of-arrays to avoid prototype pollution from header-based object keys
    const rows = xlsx.utils.sheet_to_json(worksheet, { header: 1, defval: '' })

    console.log('Parsed Excel rows (first 5):', rows.slice(0, 5))

    if (!rows || rows.length < 2) {
      return res.status(400).json({
        error: 'Excel file is empty or has no data rows',
        details: 'Please ensure your Excel file has a header row and at least one data row'
      })
    }

    // Extract headers from first row (raw strings)
    const headers = rows[0].map(h => String(h ?? '').trim())
    console.log('Detected headers from first row:', headers)

    // Map columns based on keywords
    const columnIndices = {}
    
    headers.forEach((header, index) => {
      const normalized = String(header).toLowerCase().trim()
      
      if (normalized.includes('story')) {
        columnIndices['User Story'] = index
      }
      if (normalized.includes('priority') || normalized.includes('prioritás')) {
        columnIndices['Priority'] = index
      }
      if (normalized.includes('assignee') || normalized.includes('hozzárendelt')) {
        columnIndices['Assignee'] = index
      }
      if (normalized.includes('epic')) {
        columnIndices['Epic'] = index
      }
      if (normalized.includes('acceptance') || normalized.includes('criteria') || normalized.includes('kritérium')) {
        columnIndices['Acceptance Criteria'] = index
      }
    })
    
    console.log('Detected headers:', headers)
    console.log('Column indices found:', columnIndices)

    // Check if we found the essential columns
    console.log('Checking for User Story column...', columnIndices['User Story'])
    if (columnIndices['User Story'] === undefined) {
      console.log('❌ User Story column NOT FOUND - returning error')
      return res.status(400).json({
        error: 'Missing required column',
        details: `Could not find "User Story" column. Found headers: ${headers.join(', ')}. Please ensure your Excel file has the required columns.`
      })
    }
    console.log('✅ User Story column FOUND at index:', columnIndices['User Story'])

    // Convert data rows (AoA) to tickets without using header-keyed objects
    console.log('Starting ticket generation...')
    const dataRows = rows.slice(1)
    const tickets = dataRows
      .map((row, index) => {
        const safeRow = Array.isArray(row) ? row : []

        const ticket = {
          id: `MVM-${ticketCounter + index}`,
          summary: 'Untitled',
          description: '',
          priority: 'Medium',
          assignee: 'Unassigned',
          epic: 'No Epic',
          acceptanceCriteria: [],
          createdAt: new Date().toISOString()
        }

        Object.entries(columnIndices).forEach(([colName, colIndex]) => {
          const value = typeof colIndex === 'number' && colIndex >= 0 && colIndex < safeRow.length
            ? String(safeRow[colIndex] ?? '').trim()
            : ''

          switch (colName) {
            case 'User Story':
              ticket.summary = value ? value.substring(0, 100) : 'Untitled'
              ticket.description = value || ''
              break
            case 'Priority':
              ticket.priority = priorityMap[value] || value || 'Medium'
              break
            case 'Assignee':
              ticket.assignee = value || 'Unassigned'
              break
            case 'Epic':
              ticket.epic = value || 'No Epic'
              break
            case 'Acceptance Criteria':
              ticket.acceptanceCriteria = value
                ? value.split(/\n|\\n|<br>|<br\/>|<br \/>/).map(c => c.trim()).filter(c => c)
                : []
              break
          }
        })

        console.log(`Processing ticket ${ticket.id}:`, {
          summary: ticket.summary,
          priority: ticket.priority,
          assignee: ticket.assignee,
          epic: ticket.epic,
          acceptanceCriteria: ticket.acceptanceCriteria
        })

        // Apply grounding validation
        const sourceData = { rowIndex: index, originalRow: safeRow }
        const groundedTicket = groundingService.enhanceWithGrounding(ticket, sourceData)
        
        console.log(`Grounding validation for ${ticket.id}:`, {
          isValid: groundedTicket._grounding.validated,
          confidence: groundedTicket._grounding.confidence,
          issues: groundedTicket._grounding.issues.length,
          warnings: groundedTicket._grounding.warnings.length
        })

        return groundedTicket
      })
      .filter(ticket => ticket.summary.trim() !== '')

    // Update counter for next upload
    ticketCounter += tickets.length

    // Calculate average confidence for monitoring
    const averageConfidence = tickets.length > 0 ? 
      tickets.reduce((sum, ticket) => sum + (ticket._grounding?.confidence || 0), 0) / tickets.length : 0

    // Track completion with monitoring
    monitoringService.trackCompletion(sessionId, {
      success: true,
      ticketsGenerated: tickets.length,
      averageConfidence,
      processingTime: Date.now() - monitoringService.sessionData.find(s => s.id === sessionId).startTime
    })

    console.log('Generated tickets:', tickets)
    res.json({ tickets })

  } catch (error) {
    console.error('Error processing file:', error)
    
    // Track error with monitoring
    monitoringService.trackCompletion(sessionId, { 
      success: false, 
      error: error.message 
    })
    
    res.status(500).json({ error: 'Failed to process file: ' + error.message })
  }
})

// Document upload endpoint for Word files
app.post('/api/upload/document', uploadWithFilter.single('file'), async (req, res) => {
  // Track request start
  const sessionId = monitoringService.trackRequest({
    endpoint: '/api/upload/document',
    fileSize: req.file?.size || 0,
    fileName: req.file?.originalname || 'unknown'
  })

  try {
    if (!req.file) {
      monitoringService.trackCompletion(sessionId, { success: false, error: 'No file uploaded' })
      return res.status(400).json({ error: 'No file uploaded' })
    }

    // Check file type
    const isWordFile = req.file.mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'

    if (isWordFile) {
      console.log('Processing Word document:', req.file.originalname)
      
      const parser = new DocumentParser()
      const wordBuffer = req.file.buffer.buffer || req.file.buffer
      const structuredContent = await parser.extractStructuredContent(wordBuffer)
      const plainText = structuredContent.text || await parser.parseWordDocument(wordBuffer)
      const preview = parser.generateWordPreview(structuredContent)

      console.log('Extracted text from Word document (first 500 chars):', plainText.substring(0, 500))

      // Convert document content to tickets
      const ticketStartId = Math.floor(Math.random() * 900) + 1001
      const tickets = parser.convertToTickets(plainText, {
        priority: 'Medium',
        assignee: 'Unassigned',
        epic: 'No Epic',
        ticketPrefix: 'MVM',
        ticketNumber: ticketStartId
      })

      // Apply grounding validation to each ticket
      const groundedTickets = tickets.map((ticket, index) => {
        const sourceData = { fileType: 'word', fileName: req.file.originalname, ticketIndex: index }
        return groundingService.enhanceWithGrounding(ticket, sourceData)
      })

      // Track completion with monitoring
      const averageConfidence = groundedTickets.length > 0 ? 
        groundedTickets.reduce((sum, ticket) => sum + (ticket._grounding?.confidence || 0), 0) / groundedTickets.length : 0

      monitoringService.trackCompletion(sessionId, {
        success: true,
        ticketsGenerated: groundedTickets.length,
        averageConfidence,
        fileType: 'word'
      })

      console.log('Generated tickets from Word document:', groundedTickets.length)

      let diagrams = null
      try {
        diagrams = await diagramService.generateFromTickets(groundedTickets, {
          type: 'bpmn',
          formats: ['svg', 'xml', 'png'],
          diagramId: `word_${Date.now()}`,
          workforceMetadata: {
            fileName: req.file.originalname,
            source: 'word-upload',
            ticketCount: groundedTickets.length
          }
        })
      } catch (diagramError) {
        console.warn('Diagram generation failed for Word document:', diagramError.message)
      }

      res.json({ 
        tickets: groundedTickets,
        source: 'document',
        fileType: 'word',
        preview,
        diagrams
      })
    } else {
      // Handle Excel file (keep existing logic for backward compatibility)
      console.log('Processing Excel file:', req.file.originalname)
      
      const workbook = xlsx.read(req.file.buffer, { type: 'buffer', cellText: false, cellDates: true })
      const sheetName = workbook.SheetNames[0]
      const worksheet = workbook.Sheets[sheetName]

      const rows = xlsx.utils.sheet_to_json(worksheet, { header: 1, defval: '' })

      if (!rows || rows.length < 2) {
        return res.status(400).json({
          error: 'Excel file is empty or has no data rows',
          details: 'Please ensure your Excel file has a header row and at least one data row'
        })
      }

      const headers = rows[0].map(h => String(h ?? '').trim())
      const columnIndices = {}
      
      headers.forEach((header, index) => {
        const normalized = String(header).toLowerCase().trim()
        
        if (normalized.includes('story')) {
          columnIndices['User Story'] = index
        }
        if (normalized.includes('priority') || normalized.includes('prioritás')) {
          columnIndices['Priority'] = index
        }
        if (normalized.includes('assignee') || normalized.includes('hozzárendelt')) {
          columnIndices['Assignee'] = index
        }
        if (normalized.includes('epic')) {
          columnIndices['Epic'] = index
        }
        if (normalized.includes('acceptance') || normalized.includes('criteria') || normalized.includes('kritérium')) {
          columnIndices['Acceptance Criteria'] = index
        }
      })

      if (columnIndices['User Story'] === undefined) {
        return res.status(400).json({
          error: 'Missing required column',
          details: `Could not find "User Story" column. Found headers: ${headers.join(', ')}`
        })
      }

      const dataRows = rows.slice(1)
      const tickets = dataRows.map((row, index) => {
        const safeRow = Array.isArray(row) ? row : []

        const ticket = {
          id: `MVM-${ticketCounter + index}`,
          summary: 'Untitled',
          description: '',
          priority: 'Medium',
          assignee: 'Unassigned',
          epic: 'No Epic',
          acceptanceCriteria: [],
          createdAt: new Date().toISOString()
        }

        Object.entries(columnIndices).forEach(([colName, colIndex]) => {
          const value = typeof colIndex === 'number' && colIndex >= 0 && colIndex < safeRow.length
            ? String(safeRow[colIndex] ?? '').trim()
            : ''

          switch (colName) {
            case 'User Story':
              ticket.summary = value ? value.substring(0, 100) : 'Untitled'
              ticket.description = value || ''
              break
            case 'Priority':
              ticket.priority = priorityMap[value] || value || 'Medium'
              break
            case 'Assignee':
              ticket.assignee = value || 'Unassigned'
              break
            case 'Epic':
              ticket.epic = value || 'No Epic'
              break
            case 'Acceptance Criteria':
              ticket.acceptanceCriteria = value
                ? value.split(/\n|\\n|<br>|<br\/>|<br \/>/).map(c => c.trim()).filter(c => c)
                : []
              break
          }
        })

        const sourceData = { rowIndex: index, originalRow: safeRow }
        return groundingService.enhanceWithGrounding(ticket, sourceData)
      }).filter(ticket => ticket.summary.trim() !== '')

      ticketCounter += tickets.length

      const averageConfidence = tickets.length > 0 ? 
        tickets.reduce((sum, ticket) => sum + (ticket._grounding?.confidence || 0), 0) / tickets.length : 0

      monitoringService.trackCompletion(sessionId, {
        success: true,
        ticketsGenerated: tickets.length,
        averageConfidence,
        fileType: 'excel'
      })

      console.log('Generated tickets from Excel:', tickets.length)
      const parser = new DocumentParser()
      const preview = parser.generateExcelPreview(rows, {
        hasHeaderRow: true,
        detectedColumns: Object.keys(columnIndices)
      })

      let diagrams = null
      try {
        diagrams = await diagramService.generateFromTickets(tickets, {
          type: 'bpmn',
          formats: ['svg', 'xml', 'png'],
          diagramId: `excel_${Date.now()}`,
          workforceMetadata: {
            fileName: req.file.originalname,
            source: 'excel-upload',
            ticketCount: tickets.length
          }
        })
      } catch (diagramError) {
        console.warn('Diagram generation failed for Excel document:', diagramError.message)
      }

      res.json({ 
        tickets,
        source: 'document',
        fileType: 'excel',
        preview,
        diagrams
      })
    }
  } catch (error) {
    console.error('Error processing document:', error)
    
    monitoringService.trackCompletion(sessionId, { 
      success: false, 
      error: error.message 
    })
    
    res.status(500).json({ error: 'Failed to process document: ' + error.message })
  }
})

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    version: '1.0.0'
  })
})

// Grounding statistics endpoint
app.get('/api/grounding/stats', (req, res) => {
  try {
    const stats = groundingService.getGroundingStats()
    res.json({
      status: 'OK',
      grounding: stats,
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    res.status(500).json({
      error: 'Failed to get grounding stats',
      details: error.message
    })
  }
})

// Grounding validation endpoint
app.post('/api/grounding/validate', (req, res) => {
  try {
    const { ticket, sourceData } = req.body
    
    if (!ticket) {
      return res.status(400).json({
        error: 'Missing ticket data',
        details: 'Please provide ticket object in request body'
      })
    }

    const validation = groundingService.validateTicket(ticket, sourceData || {})
    res.json({
      status: 'OK',
      validation,
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    res.status(500).json({
      error: 'Failed to validate ticket',
      details: error.message
    })
  }
})

// Monitoring metrics endpoint
app.get('/api/monitoring/metrics', (req, res) => {
  try {
    const metrics = monitoringService.getMetrics()
    res.json({
      status: 'OK',
      metrics,
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    res.status(500).json({
      error: 'Failed to get monitoring metrics',
      details: error.message
    })
  }
})

// Monitoring alerts endpoint
app.get('/api/monitoring/alerts', (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10
    const alerts = monitoringService.getRecentAlerts(limit)
    res.json({
      status: 'OK',
      alerts,
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    res.status(500).json({
      error: 'Failed to get monitoring alerts',
      details: error.message
    })
  }
})

// Monitoring performance history endpoint
app.get('/api/monitoring/performance', (req, res) => {
  try {
    const hours = parseInt(req.query.hours) || 24
    const history = monitoringService.getPerformanceHistory(hours)
    res.json({
      status: 'OK',
      history,
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    res.status(500).json({
      error: 'Failed to get performance history',
      details: error.message
    })
  }
})

// Monitoring data export endpoint
app.get('/api/monitoring/export', (req, res) => {
  try {
    const data = monitoringService.exportData()
    res.json({
      status: 'OK',
      data,
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    res.status(500).json({
      error: 'Failed to export monitoring data',
      details: error.message
    })
  }
})

// OAuth Routes
app.get('/auth/jira', (req, res) => {
  try {
    const state = generateOAuthState()
    const authUrl = JiraService.getAuthorizationURL(state)
    res.redirect(authUrl)
  } catch (error) {
    console.error('Error initiating Jira OAuth:', error)
    res.status(500).json({
      error: 'Failed to initiate Jira authentication',
      details: error.message
    })
  }
})

app.get('/auth/jira/callback', async (req, res) => {
  try {
    const { code, state, error, error_description } = req.query

    // Check for OAuth errors
    if (error) {
      console.error('OAuth error:', error, error_description)
      return res.status(400).json({
        error: 'OAuth authentication failed',
        details: error_description || error
      })
    }

    // Validate state parameter
    if (!validateOAuthState(state)) {
      console.error('Invalid OAuth state')
      return res.status(400).json({
        error: 'Invalid OAuth state',
        details: 'State parameter validation failed. Please try again.'
      })
    }

    // Exchange code for access token
    const tokenData = await JiraService.exchangeCodeForToken(code)

    // Create user session and store token
    const sessionId = SessionStore.createSession('jira-user')
    SessionStore.setJiraToken(sessionId, tokenData)

    // Store token in JiraService for immediate use
    JiraService.setUserToken('jira-user', tokenData)

    // Redirect to frontend with session info
    const redirectUrl = `${req.protocol}://${req.get('host')}/?sessionId=${sessionId}&auth=success`
    res.redirect(redirectUrl)
  } catch (error) {
    console.error('Error handling Jira OAuth callback:', error)
    const errorRedirect = `${req.protocol}://${req.get('host')}/?auth=error&message=${encodeURIComponent(error.message)}`
    res.redirect(errorRedirect)
  }
})

// Jira API Endpoint - Create Tickets
app.post('/api/jira/create-tickets', async (req, res) => {
  try {
    const { tickets, sessionId } = req.body

    // Validate input
    if (!tickets || !Array.isArray(tickets) || tickets.length === 0) {
      return res.status(400).json({
        error: 'Invalid request',
        details: 'Please provide an array of tickets to create'
      })
    }

    if (!sessionId) {
      return res.status(401).json({
        error: 'Unauthorized',
        details: 'No valid session found. Please authenticate with Jira first.',
        authUrl: '/auth/jira'
      })
    }

    // Validate session and get token
    const session = SessionStore.getSession(sessionId)
    if (!session || !SessionStore.isJiraTokenValid(sessionId)) {
      return res.status(401).json({
        error: 'Session expired or invalid',
        details: 'Please authenticate with Jira again.',
        authUrl: '/auth/jira'
      })
    }

    const tokenData = SessionStore.getJiraToken(sessionId)
    if (!tokenData) {
      return res.status(401).json({
        error: 'No Jira token found',
        details: 'Please authenticate with Jira.',
        authUrl: '/auth/jira'
      })
    }

    console.log(`Creating ${tickets.length} Jira tickets...`)

    // Create multiple issues in Jira
    const result = await JiraService.createMultipleIssues(
      tickets,
      'jira-user',
      tokenData.accessToken
    )

    // Track completion with monitoring
    monitoringService.trackCompletion(Date.now().toString(), {
      success: true,
      operation: 'jira-ticket-creation',
      ticketsCreated: result.successful,
      ticketsFailed: result.failed,
      totalTickets: result.total
    })

    res.json({
      success: true,
      message: `Successfully created ${result.successful} out of ${result.total} tickets`,
      result: {
        total: result.total,
        successful: result.successful,
        failed: result.failed,
        tickets: result.results.map(r => ({
          originalId: r.originalTicket.id,
          jiraKey: r.issueKey,
          jiraId: r.issueId,
          status: 'created'
        })),
        errors: result.errors
      }
    })
  } catch (error) {
    console.error('Error creating Jira tickets:', error)
    res.status(500).json({
      error: 'Failed to create Jira tickets',
      details: error.message,
      authUrl: '/auth/jira'
    })
  }
})

// Jira Status Endpoint - Check authentication status
app.get('/api/jira/status', (req, res) => {
  try {
    const { sessionId } = req.query

    if (!sessionId) {
      return res.json({
        authenticated: false,
        message: 'No session found'
      })
    }

    const session = SessionStore.getSession(sessionId)
    const isValid = session && SessionStore.isJiraTokenValid(sessionId)

    res.json({
      authenticated: isValid,
      sessionId: isValid ? sessionId : null,
      message: isValid ? 'Authenticated' : 'Session expired or invalid',
      authUrl: isValid ? null : '/auth/jira'
    })
  } catch (error) {
    res.status(500).json({
      error: 'Failed to check Jira status',
      details: error.message
    })
  }
})

// Jira Logout Endpoint
app.post('/api/jira/logout', (req, res) => {
  try {
    const { sessionId } = req.body

    if (sessionId) {
      SessionStore.deleteSession(sessionId)
    }

    res.json({
      success: true,
      message: 'Logged out successfully'
    })
  } catch (error) {
    res.status(500).json({
      error: 'Failed to logout',
      details: error.message
    })
  }
})

// Diagram rendering endpoint
app.post('/api/diagrams/render', async (req, res) => {
  try {
    const { definition, formats } = req.body || {}
    if (!definition || typeof definition !== 'string') {
      return res.status(400).json({ error: 'Missing diagram definition' })
    }

    const diagram = await diagramService.renderDefinition(definition, formats)
    res.json({ diagram })
  } catch (error) {
    console.error('Diagram render error:', error)
    res.status(500).json({ error: error.message })
  }
})

app.post('/api/diagrams/generate', async (req, res) => {
  try {
    const { tickets, type, formats, diagramId, workforceMetadata } = req.body || {}
    if (!Array.isArray(tickets) || tickets.length === 0) {
      return res.status(400).json({ error: 'Tickets array is required to generate diagram' })
    }

    const diagram = await diagramService.generateFromTickets(tickets, {
      type,
      formats,
      diagramId,
      workforceMetadata
    })

    res.json({ diagram })
  } catch (error) {
    console.error('Diagram generation error:', error)
    res.status(500).json({ error: error.message })
  }
})

// Error handling middleware
app.use((error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        error: 'File too large',
        details: 'Please upload a file smaller than 10MB'
      })
    }
  }

  res.status(400).json({
    error: error.message,
    details: 'Please check your file format and try again'
  })
})

// Root route - serve the main HTML file
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'))
})

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully')
  process.exit(0)
})

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully')
  process.exit(0)
})

// Root route - serve the main HTML file
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'))
})

// 404 handler - must be last
app.use((req, res) => {
  res.status(404).json({
    error: 'Route not found',
    details: 'The requested endpoint does not exist'
  })
})

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Excel to Jira Ticket Converter server running on port ${PORT}`)
  console.log(`📊 Health check: http://localhost:${PORT}/api/health`)
  console.log(`📤 Upload endpoint: http://localhost:${PORT}/api/upload`)
  console.log(`🏠 Root endpoint: http://localhost:${PORT}/`)
  console.log(`📋 Expected columns: User Story, Priority, Assignee, Epic, Acceptance Criteria`)
  console.log(`🔄 Memory storage enabled - no file cleanup needed`)
})
