/**
 * ⚠️ DEPRECATED: JavaScript/Node.js Backend Server
 * 
 * This file is DEPRECATED and will be removed in a future release.
 * 
 * **Status**: Legacy/Fallback
 * **Deprecation Date**: January 2025
 * **Planned Removal**: Q2 2025 (after Python backend production verification)
 * 
 * **Migration Guide**: 
 * - See `START_HERE_PYTHON_BACKEND.md` for Python backend setup
 * - Python backend: `python-backend/main.py` (port 8000)
 * - This server: `server.js` (port 5000, legacy)
 * 
 * **Why Deprecated**:
 * - Functionality migrated to Python FastAPI backend
 * - Python backend provides better performance and maintainability
 * - Reduces code duplication and maintenance burden
 * 
 * **Action Required**:
 * - Use Python backend for all new development
 * - Migrate existing deployments to Python backend
 * - This server is kept as fallback only
 * 
 * **Support**:
 * - Python backend documentation: `python-backend/README.md`
 * - Migration guide: `BACKEND_MIGRATION_SUMMARY.md`
 * - Cleanup plan: `CODE_CLEANUP_RECOMMENDATIONS.md`
 */

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
import complianceService from './src/services/complianceService.js'

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

// ========================================
// LangGraph Agent System
// ========================================
let agentHealthy = false
let baWorkflow = null
let baseAgent = null
let ticketAgent = null

/**
 * Initialize LangGraph agent system
 * Loads agents and workflows if LANGGRAPH_ENABLED=true and ANTHROPIC_API_KEY is set
 */
async function initializeAgentSystem() {
  const langGraphEnabled = process.env.LANGGRAPH_ENABLED === 'true'
  
  if (!langGraphEnabled) {
    console.log('[Config] LangGraph disabled, using rule-based mode only')
    return
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    console.warn('[Config] ANTHROPIC_API_KEY missing, falling back to rule-based mode')
    return
  }

  try {
    console.log('[Config] Initializing LangGraph agent system...')
    
    // Import agent classes dynamically
    const { default: BaseAgent } = await import('./src/agents/BaseAgent.js')
    const { default: TicketAgent } = await import('./src/agents/TicketAgent.js')
    const { default: BAWorkflow } = await import('./src/workflows/BAWorkflow.js')
    
    // Initialize BaseAgent
    baseAgent = new BaseAgent({
      apiKey: process.env.ANTHROPIC_API_KEY,
      model: process.env.ANTHROPIC_MODEL,
      maxTokens: process.env.ANTHROPIC_MAX_TOKENS,
      temperature: process.env.ANTHROPIC_TEMPERATURE,
      monitoringService
    })

    // Initialize TicketAgent
    ticketAgent = new TicketAgent({
      apiKey: process.env.ANTHROPIC_API_KEY,
      model: process.env.ANTHROPIC_MODEL,
      groundingService,
      complianceService,
      monitoringService
    })

    // Initialize BAWorkflow
    baWorkflow = new BAWorkflow({
      ticketAgent,
      groundingService,
      complianceService,
      monitoringService
    })

    // Health check
    const healthResult = await baseAgent.healthCheck()
    agentHealthy = healthResult.success

    console.log(`[Config] Agent system initialized: healthy=${agentHealthy}, model=${baseAgent.model}`)
    
    // Periodic health check (every 5 minutes)
    const checkInterval = parseInt(process.env.LANGGRAPH_HEALTH_CHECK_INTERVAL_MS) || 300000
    setInterval(async () => {
      try {
        const health = await baseAgent.healthCheck()
        agentHealthy = health.success
        console.log(`[Agent] Health check: ${agentHealthy ? 'OK' : 'FAILED'}`)
      } catch (error) {
        agentHealthy = false
        console.error('[Agent] Health check failed:', error.message)
      }
    }, checkInterval)

  } catch (error) {
    console.error('[Config] Failed to initialize agent system:', error.message)
    console.warn('[Config] Falling back to rule-based mode')
    agentHealthy = false
  }
}

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

/**
 * Process tickets using rule-based logic (fallback/original method)
 * @param {Array} rows - Excel rows (array of arrays)
 * @param {Object} columnIndices - Column index mapping
 * @returns {Array} Processed tickets
 */
function processTicketsRuleBased(rows, columnIndices) {
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

      // Populate fields from Excel
      if (columnIndices['User Story'] !== undefined) {
        ticket.summary = String(safeRow[columnIndices['User Story']] ?? 'Untitled').trim()
      }

      if (columnIndices['Priority'] !== undefined) {
        const rawPriority = String(safeRow[columnIndices['Priority']] ?? 'Medium').trim()
        ticket.priority = priorityMap[rawPriority] || rawPriority || 'Medium'
      }

      if (columnIndices['Assignee'] !== undefined) {
        ticket.assignee = String(safeRow[columnIndices['Assignee']] ?? 'Unassigned').trim()
      }

      if (columnIndices['Epic'] !== undefined) {
        ticket.epic = String(safeRow[columnIndices['Epic']] ?? 'No Epic').trim()
      }

      if (columnIndices['Acceptance Criteria'] !== undefined) {
        const rawCriteria = safeRow[columnIndices['Acceptance Criteria']]
        if (rawCriteria) {
          const criteriaText = String(rawCriteria).trim()
          ticket.acceptanceCriteria = criteriaText.split(/[;\n]/).map(c => c.trim()).filter(c => c)
        }
      }

      // Enhanced description
      ticket.description = `User Story: ${ticket.summary}\n\nPriority: ${ticket.priority}\nAssignee: ${ticket.assignee}\nEpic: ${ticket.epic}`

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
    .filter(ticket => ticket.summary.trim() !== '' && ticket.summary !== 'Untitled')

  ticketCounter += tickets.length
  return tickets
}

// Routes
app.post('/api/upload', upload.single('file'), async (req, res) => {
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

    // ========================================
    // LangGraph Agent or Rule-based Processing
    // ========================================
    let tickets = []
    let usedAgent = false
    let fallbackTriggered = false
    
    const langGraphEnabled = process.env.LANGGRAPH_ENABLED === 'true'
    const fallbackMode = process.env.LANGGRAPH_FALLBACK_MODE || 'auto'
    
    // Try agent-based processing
    if (langGraphEnabled && agentHealthy && fallbackMode !== 'always_rule_based') {
      try {
        console.log('[Agent] Starting BAWorkflow for session:', sessionId)
        
        // Execute BAWorkflow
        const workflowResult = await baWorkflow.execute({
          rows,
          fileName: req.file.originalname,
          sessionId
        })
        
        tickets = workflowResult.tickets
        usedAgent = true
        
        console.log(`[Agent] Successfully processed ${tickets.length} tickets`)
        
      } catch (agentError) {
        console.error('[Agent] Workflow error:', agentError.message)
        console.warn('[Agent] Fallback triggered due to error')
        
        fallbackTriggered = true
        
        // Fallback to rule-based processing
        tickets = processTicketsRuleBased(rows, columnIndices)
      }
    } else {
      // Rule-based processing (original logic)
      const reason = !langGraphEnabled ? 'disabled' : 
                     !agentHealthy ? 'unhealthy' :
                     'always_rule_based mode'
      console.log(`[Rule-based] Processing with traditional logic (reason: ${reason})`)
      tickets = processTicketsRuleBased(rows, columnIndices)
    }

    // If we still have empty tickets (shouldn't happen with proper fallback), log warning
    if (tickets.length === 0) {
      console.warn('[Warning] No tickets generated from', rows.length - 1, 'data rows')
    }

    // Skip the old inline logic since processTicketsRuleBased handles it now
    if (false) {
    const dataRows = rows.slice(1)
      const oldTickets = dataRows
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
    }

    // Calculate average confidence for monitoring
    const averageConfidence = tickets.length > 0 ? 
      tickets.reduce((sum, ticket) => sum + (ticket._grounding?.confidence || 0), 0) / tickets.length : 0

    // Track completion with monitoring
    monitoringService.trackCompletion(sessionId, {
      success: true,
      ticketsGenerated: tickets.length,
      averageConfidence,
      agentUsed: usedAgent,
      fallbackTriggered: fallbackTriggered,
      processingTime: Date.now() - monitoringService.sessionData.find(s => s.id === sessionId)?.startTime
    })

    console.log('Generated tickets:', tickets.length)
    res.json({ 
      tickets,
      _metadata: {
        processedBy: usedAgent ? 'langgraph-agent' : 'rule-based',
        fallback: fallbackTriggered,
        agentHealthy,
        langGraphEnabled,
        averageConfidence
      }
    })

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
      
      // Extract AI provider and model from request body (sent from UI)
      const aiProvider = req.body.aiProvider || process.env.AI_PROVIDER || 'openai'
      const aiModel = req.body.aiModel || null // Let service choose default
      
      console.log(`AI Configuration: Provider=${aiProvider}, Model=${aiModel || 'default'}`)
      
      const parser = new DocumentParser({
        provider: aiProvider,
        model: aiModel
      })
      
      // Ensure we have a proper ArrayBuffer for mammoth
      const wordBuffer = Buffer.isBuffer(req.file.buffer) 
        ? req.file.buffer.buffer.slice(req.file.buffer.byteOffset, req.file.buffer.byteOffset + req.file.buffer.byteLength)
        : req.file.buffer
      
      try {
        const structuredContent = await parser.extractStructuredContent(wordBuffer)
        const plainText = structuredContent.text || await parser.parseWordDocument(wordBuffer)
        const preview = parser.generateWordPreview(structuredContent)

        console.log('Extracted text from Word document (first 500 chars):', plainText.substring(0, 500))

        // Convert document content to tickets using AI analysis
        const ticketStartId = Math.floor(Math.random() * 900) + 1001
        const analysisResult = await parser.analyzeWithAI(plainText, {
          priority: 'Medium',
          assignee: 'Unassigned',
          ticketPrefix: 'MVM',
          ticketNumber: ticketStartId
        })

        const tickets = analysisResult.tickets
        const epics = analysisResult.epics
        const processFlow = analysisResult.processFlow
        const strategicInsights = analysisResult.strategicInsights
        const aiMetadata = analysisResult.metadata

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
          diagrams,
          // AI analysis results
          epics: epics || [],
          processFlow: processFlow || null,
          strategicInsights: strategicInsights || null,
          aiMetadata: aiMetadata || { aiPowered: false }
        })
      } catch (wordParseError) {
        console.error('Word document parsing error:', wordParseError.message)
        monitoringService.trackCompletion(sessionId, { success: false, error: wordParseError.message })
        return res.status(400).json({
          error: 'Failed to parse Word document',
          details: wordParseError.message
        })
      }
    } else {
      // Handle Excel file (keep existing logic for backward compatibility)
      console.log('Processing Excel file:', req.file.originalname)
      
      try {
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
      } catch (excelError) {
        console.error('Error parsing Excel file:', excelError)
        monitoringService.trackCompletion(sessionId, { 
          success: false, 
          error: `Excel parsing error: ${excelError.message}` 
        })
        
        return res.status(400).json({
          error: 'Failed to parse Excel file',
          details: excelError.message || 'The Excel file appears to be corrupted or in an unsupported format',
          type: excelError.name
        })
      }
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

// ========================================
// Agent System Endpoints
// ========================================

// Agent status endpoint
app.get('/api/agent/status', async (req, res) => {
  try {
    const status = {
      enabled: process.env.LANGGRAPH_ENABLED === 'true',
      healthy: agentHealthy,
      model: process.env.ANTHROPIC_MODEL || 'claude-3-5-sonnet-20241022',
      fallbackMode: process.env.LANGGRAPH_FALLBACK_MODE || 'auto',
      timestamp: new Date().toISOString()
    }

    if (baseAgent && agentHealthy) {
      const stats = baseAgent.getStats()
      status.stats = stats
    }

    res.json(status)
  } catch (error) {
    res.status(500).json({
      error: 'Failed to get agent status',
      details: error.message
    })
  }
})

// Explicit agent-based processing endpoint
app.post('/api/upload/agent', upload.single('file'), async (req, res) => {
  const sessionId = monitoringService.trackRequest({
    endpoint: '/api/upload/agent',
    fileSize: req.file?.size || 0,
    fileName: req.file?.originalname || 'unknown'
  })

  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' })
    }

    if (!agentHealthy) {
      return res.status(503).json({
        error: 'Agent system unavailable',
        details: 'The AI agent system is not healthy. Use /api/upload for automatic fallback.'
      })
    }

    // Parse Excel
    const workbook = xlsx.read(req.file.buffer, { type: 'buffer' })
    const rows = xlsx.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]], { header: 1 })

    // Execute BAWorkflow (no fallback)
    const result = await baWorkflow.execute({
      rows,
      fileName: req.file.originalname,
      sessionId
    })

    monitoringService.trackCompletion(sessionId, {
      success: true,
      ticketsGenerated: result.tickets.length,
      agentUsed: true
    })

    res.json({
      tickets: result.tickets,
      _metadata: {
        processedBy: 'langgraph-agent',
        workflowMetadata: result.metadata
      }
    })
  } catch (error) {
    console.error('[Agent] Explicit agent processing failed:', error.message)
    monitoringService.trackCompletion(sessionId, { success: false, error: error.message })
    res.status(500).json({
      error: 'Agent processing failed',
      details: error.message
    })
  }
})

// Explicit rule-based processing endpoint
app.post('/api/upload/rule-based', upload.single('file'), (req, res) => {
  const sessionId = monitoringService.trackRequest({
    endpoint: '/api/upload/rule-based',
    fileSize: req.file?.size || 0,
    fileName: req.file?.originalname || 'unknown'
  })

  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' })
    }

    // Parse Excel
    const workbook = xlsx.read(req.file.buffer, { type: 'buffer' })
    const worksheet = workbook.Sheets[workbook.SheetNames[0]]
    const rows = xlsx.utils.sheet_to_json(worksheet, { header: 1 })

    // Column mapping
    const headers = rows[0].map(h => String(h ?? '').trim())
    const columnIndices = {}
    headers.forEach((header, index) => {
      const normalized = header.toLowerCase().trim()
      if (normalized.includes('story')) columnIndices['User Story'] = index
      if (normalized.includes('priority') || normalized.includes('prioritás')) columnIndices['Priority'] = index
      if (normalized.includes('assignee')) columnIndices['Assignee'] = index
      if (normalized.includes('epic')) columnIndices['Epic'] = index
      if (normalized.includes('acceptance') || normalized.includes('criteria')) columnIndices['Acceptance Criteria'] = index
    })

    // Process with rule-based logic
    const tickets = processTicketsRuleBased(rows, columnIndices)

    monitoringService.trackCompletion(sessionId, {
      success: true,
      ticketsGenerated: tickets.length,
      agentUsed: false
    })

    res.json({
      tickets,
      _metadata: {
        processedBy: 'rule-based',
        explicitMode: true
      }
    })
  } catch (error) {
    console.error('[Rule-based] Explicit rule-based processing failed:', error.message)
    monitoringService.trackCompletion(sessionId, { success: false, error: error.message })
    res.status(500).json({
      error: 'Rule-based processing failed',
      details: error.message
    })
  }
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

app.get('/api/compliance/standards', (req, res) => {
  try {
    const standards = complianceService.getAvailableStandards()
    res.json({ standards })
  } catch (error) {
    console.error('Compliance standards error:', error)
    res.status(500).json({
      error: 'Failed to fetch compliance standards',
      details: error.message
    })
  }
})

app.post('/api/compliance/validate', (req, res) => {
  try {
    const { tickets, standards } = req.body || {}

    if (!Array.isArray(tickets) || tickets.length === 0) {
      return res.status(400).json({
        error: 'Tickets array is required for compliance validation'
      })
    }

    const results = complianceService.evaluateTickets(tickets, { standards })
    res.json({ results })
  } catch (error) {
    console.error('Compliance validation error:', error)
    res.status(500).json({
      error: 'Failed to validate compliance',
      details: error.message
    })
  }
})

app.post('/api/compliance/report', (req, res) => {
  try {
    const { tickets, standards } = req.body || {}

    if (!Array.isArray(tickets) || tickets.length === 0) {
      return res.status(400).json({
        error: 'Tickets array is required to generate compliance report'
      })
    }

    const report = complianceService.generateReport(tickets, { standards })
    res.json({ report })
  } catch (error) {
    console.error('Compliance report error:', error)
    res.status(500).json({
      error: 'Failed to generate compliance report',
      details: error.message
    })
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
    // Handle other Multer errors
    return res.status(400).json({
      error: 'File upload error',
      details: error.message
    })
  }

  if (error.message && error.message.includes('Invalid file type')) {
    return res.status(400).json({
      error: 'Invalid file type',
      details: error.message
    })
  }

  console.error('Unhandled error:', error)
  
  res.status(500).json({
    error: 'Internal server error',
    details: error.message || 'An unexpected error occurred',
    timestamp: new Date().toISOString()
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
// AI Models endpoint - returns available models
app.get('/api/ai/models', (req, res) => {
  const models = {
    openai: [
      { 
        id: 'gpt-4-turbo-preview', 
        name: 'GPT-4 Turbo', 
        provider: 'OpenAI',
        cost: '$0.03/1K tokens',
        speed: 'Medium',
        quality: 'Excellent',
        recommended: true
      },
      { 
        id: 'gpt-4', 
        name: 'GPT-4', 
        provider: 'OpenAI',
        cost: '$0.03/1K tokens',
        speed: 'Slow',
        quality: 'Excellent'
      },
      { 
        id: 'gpt-3.5-turbo', 
        name: 'GPT-3.5 Turbo', 
        provider: 'OpenAI',
        cost: '$0.002/1K tokens',
        speed: 'Fast',
        quality: 'Good',
        budget: true
      }
    ],
    openrouter: [
      { 
        id: 'openai/gpt-4-turbo-preview', 
        name: 'GPT-4 Turbo (OpenRouter)', 
        provider: 'OpenAI via OpenRouter',
        cost: '$0.03/1K tokens',
        speed: 'Medium',
        quality: 'Excellent'
      },
      { 
        id: 'openai/gpt-3.5-turbo', 
        name: 'GPT-3.5 Turbo (OpenRouter)', 
        provider: 'OpenAI via OpenRouter',
        cost: '$0.002/1K tokens',
        speed: 'Fast',
        quality: 'Good',
        budget: true,
        recommended: true
      },
      { 
        id: 'anthropic/claude-3-opus', 
        name: 'Claude 3 Opus', 
        provider: 'Anthropic',
        cost: '$0.075/1K tokens',
        speed: 'Medium',
        quality: 'Excellent',
        premium: true
      },
      { 
        id: 'anthropic/claude-3-sonnet', 
        name: 'Claude 3 Sonnet', 
        provider: 'Anthropic',
        cost: '$0.015/1K tokens',
        speed: 'Fast',
        quality: 'Very Good'
      },
      { 
        id: 'anthropic/claude-3-haiku', 
        name: 'Claude 3 Haiku', 
        provider: 'Anthropic',
        cost: '$0.001/1K tokens',
        speed: 'Very Fast',
        quality: 'Good',
        budget: true
      },
      { 
        id: 'meta-llama/llama-3-70b-instruct', 
        name: 'Llama 3 70B', 
        provider: 'Meta',
        cost: '$0.0009/1K tokens',
        speed: 'Fast',
        quality: 'Good',
        budget: true
      },
      { 
        id: 'google/gemini-pro-1.5', 
        name: 'Gemini Pro 1.5', 
        provider: 'Google',
        cost: '$0.005/1K tokens',
        speed: 'Fast',
        quality: 'Very Good'
      }
    ]
  }
  
  const defaultProvider = process.env.AI_PROVIDER || 'openai'
  const hasOpenAI = !!process.env.OPENAI_API_KEY
  const hasOpenRouter = !!process.env.OPENROUTER_API_KEY
  
  res.json({
    models,
    defaultProvider,
    providers: {
      openai: {
        available: hasOpenAI,
        configured: hasOpenAI
      },
      openrouter: {
        available: hasOpenRouter,
        configured: hasOpenRouter
      }
    }
  })
})

app.use((req, res) => {
  res.status(404).json({
    error: 'Route not found',
    details: 'The requested endpoint does not exist'
  })
})

// Start server with agent system initialization
initializeAgentSystem().then(() => {
app.listen(PORT, () => {
  console.log(`🚀 Excel to Jira Ticket Converter server running on port ${PORT}`)
  console.log(`📊 Health check: http://localhost:${PORT}/api/health`)
  console.log(`📤 Upload endpoint: http://localhost:${PORT}/api/upload`)
  console.log(`🏠 Root endpoint: http://localhost:${PORT}/`)
  console.log(`📋 Expected columns: User Story, Priority, Assignee, Epic, Acceptance Criteria`)
  console.log(`🔄 Memory storage enabled - no file cleanup needed`)
    console.log(`🤖 Agent mode: ${agentHealthy ? 'ENABLED' : 'DISABLED (rule-based fallback)'}`)
    console.log(`📝 Fallback mode: ${process.env.LANGGRAPH_FALLBACK_MODE || 'auto'}`)
  })
}).catch(error => {
  console.error('[Startup] Failed to start server:', error)
  process.exit(1)
})
