import mammoth from 'mammoth'
import AIAnalysisService from './aiAnalysisService.js'

/**
 * DocumentParser Service
 * Handles parsing and extraction of content from Word documents (.docx files)
 */
class DocumentParser {
  constructor(aiOptions = {}) {
    this.aiService = new AIAnalysisService(aiOptions)
  }
  /**
   * Parse a Word document buffer and extract plain text
   * @param {Buffer} buffer - The .docx file buffer
   * @returns {Promise<string>} Plain text content from the document
   */
  async parseWordDocument(buffer) {
    try {
      const mammothBuffer = buffer instanceof ArrayBuffer ? Buffer.from(buffer) : buffer
      const result = await mammoth.extractRawText({ buffer: mammothBuffer })
      return result.value
    } catch (error) {
      throw new Error(`Failed to parse Word document: ${error.message}`)
    }
  }

  /**
   * Extract structured content from Word document preserving formatting
   * @param {Buffer} buffer - The .docx file buffer
   * @returns {Promise<Object>} Structured content with headings, lists, tables
   */
  async extractStructuredContent(buffer) {
    try {
      const mammothBuffer = buffer instanceof ArrayBuffer ? Buffer.from(buffer) : buffer
      const result = await mammoth.convertToHtml({ buffer: mammothBuffer })
      const html = result.value

      // Parse HTML to extract structure
      const structured = {
        html,
        text: this._stripHtmlTags(html),
        headings: this._extractHeadings(html),
        lists: this._extractLists(html),
        tables: this._extractTables(html),
        paragraphs: this._extractParagraphs(html)
      }

      return structured
    } catch (error) {
      throw new Error(`Failed to extract structured content: ${error.message}`)
    }
  }

  /**
   * Generate preview metadata for Word documents based on structured content or plain text
   * @param {Object|string} source - Structured content object or plain text string
   * @param {Object} options - Preview options
   * @returns {Object|null} Preview metadata for UI consumption
   */
  generateWordPreview(source, options = {}) {
    if (!source) {
      return null
    }

    const {
      maxHeadings = 5,
      maxParagraphs = 6
    } = options

    const structured = typeof source === 'object' && !Array.isArray(source) ? source : null
    const textSource = structured?.text || (typeof source === 'string' ? source : '')

    const cleanedParagraphs = textSource
      .split(/\n+/)
      .map(paragraph => paragraph.trim())
      .filter(paragraph => paragraph.length > 0)

    const wordCount = textSource
      ? textSource
          .trim()
          .split(/\s+/)
          .filter(Boolean)
          .length
      : 0

    return {
      type: 'word',
      headings: structured?.headings ? structured.headings.slice(0, maxHeadings) : [],
      paragraphs: cleanedParagraphs.slice(0, maxParagraphs),
      paragraphCount: cleanedParagraphs.length,
      wordCount,
      listHighlights: structured?.lists ? structured.lists.slice(0, 3) : []
    }
  }

  /**
   * Generate preview metadata for Excel documents
   * @param {Array[]} rows - Array of row arrays including optional header row
   * @param {Object} options - Preview options
   * @returns {Object|null} Preview metadata for UI consumption
   */
  generateExcelPreview(rows = [], options = {}) {
    if (!Array.isArray(rows) || rows.length === 0) {
      return null
    }

    const {
      hasHeaderRow = true,
      maxRows = 5,
      detectedColumns = []
    } = options

    const normalizedRows = rows.map(row => Array.isArray(row) ? row : [])
    const headerRow = hasHeaderRow ? normalizedRows[0] : options.headers || []
    const dataRows = hasHeaderRow ? normalizedRows.slice(1) : normalizedRows
    const headers = headerRow.length > 0
      ? headerRow.map(header => String(header ?? '').trim() || 'Column')
      : options.headers || []

    const maxColumns = headers.length
    const rowSamples = dataRows.slice(0, maxRows).map(row => {
      return headers.map((_, index) => {
        const cellValue = row[index]
        if (cellValue === null || cellValue === undefined) {
          return ''
        }
        if (cellValue instanceof Date) {
          return cellValue.toISOString()
        }
        return String(cellValue).trim()
      })
    })

    const totalRows = dataRows.length
    const emptyCellCount = dataRows.reduce((count, row) => {
      return count + headers.reduce((rowCount, _, index) => {
        const value = row[index]
        const isEmpty = value === null || value === undefined || String(value).trim().length === 0
        return rowCount + (isEmpty ? 1 : 0)
      }, 0)
    }, 0)

    const totalCells = totalRows * (maxColumns || 1)
    const emptyCellRatio = totalCells > 0 ? emptyCellCount / totalCells : 0

    return {
      type: 'excel',
      headers,
      rowSamples,
      sampleCount: rowSamples.length,
      totalRows,
      totalColumns: maxColumns,
      detectedColumns,
      emptyCellRatio
    }
  }

  /**
   * Extract metadata from Word document
   * @param {Buffer} buffer - The .docx file buffer
   * @returns {Promise<Object>} Document metadata (author, creation date, etc.)
   */
  async extractMetadata(buffer) {
    try {
      const mammothBuffer = buffer instanceof ArrayBuffer ? Buffer.from(buffer) : buffer
      const result = await mammoth.convertToHtml({ buffer: mammothBuffer })
      
      // Extract metadata from the document
      const metadata = {
        messages: result.messages || [],
        warnings: result.warnings || [],
        parseTime: new Date().toISOString()
      }

      return metadata
    } catch (error) {
      throw new Error(`Failed to extract metadata: ${error.message}`)
    }
  }

  /**
   * Convert document content to ticket format
   * @param {string} documentContent - Plain text or structured content from document
   * @param {Object} options - Options for ticket conversion
   * @returns {Object} Formatted ticket object
   */
  convertToTickets(documentContent, options = {}) {
    try {
      const {
        priority = 'Medium',
        assignee = 'Unassigned',
        epic = 'No Epic',
        ticketPrefix = 'MVM',
        ticketNumber = 1000
      } = options

      // Split content into sections for multiple tickets or create single ticket
      const tickets = this._parseContentToTickets(documentContent, {
        priority,
        assignee,
        epic,
        ticketPrefix,
        ticketNumber
      })

      return tickets
    } catch (error) {
      throw new Error(`Failed to convert document to tickets: ${error.message}`)
    }
  }

  /**
   * Helper method to strip HTML tags
   * @private
   */
  _stripHtmlTags(html) {
    return html
      .replace(/<[^>]*>/g, '')
      .replace(/&nbsp;/g, ' ')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&amp;/g, '&')
      .trim()
  }

  /**
   * Helper method to extract headings from HTML
   * @private
   */
  _extractHeadings(html) {
    const headingRegex = /<h[1-6][^>]*>([^<]*)<\/h[1-6]>/gi
    const headings = []
    let match

    while ((match = headingRegex.exec(html)) !== null) {
      headings.push({
        level: parseInt(match[0][2]),
        text: this._stripHtmlTags(match[1]).trim()
      })
    }

    return headings
  }

  /**
   * Helper method to extract lists from HTML
   * @private
   */
  _extractLists(html) {
    const lists = []
    const ulRegex = /<ul[^>]*>([\s\S]*?)<\/ul>/gi
    const liRegex = /<li[^>]*>([^<]*)<\/li>/gi
    let match

    while ((match = ulRegex.exec(html)) !== null) {
      const listContent = match[1]
      const items = []
      let liMatch

      while ((liMatch = liRegex.exec(listContent)) !== null) {
        items.push(this._stripHtmlTags(liMatch[1]).trim())
      }

      if (items.length > 0) {
        lists.push({ type: 'unordered', items })
      }
    }

    return lists
  }

  /**
   * Helper method to extract tables from HTML
   * @private
   */
  _extractTables(html) {
    const tables = []
    const tableRegex = /<table[^>]*>([\s\S]*?)<\/table>/gi
    const trRegex = /<tr[^>]*>([\s\S]*?)<\/tr>/gi
    const tdRegex = /<t[dh][^>]*>([^<]*)<\/t[dh]>/gi
    let tableMatch

    while ((tableMatch = tableRegex.exec(html)) !== null) {
      const tableContent = tableMatch[1]
      const rows = []
      let trMatch

      while ((trMatch = trRegex.exec(tableContent)) !== null) {
        const rowContent = trMatch[1]
        const cells = []
        let tdMatch

        while ((tdMatch = tdRegex.exec(rowContent)) !== null) {
          cells.push(this._stripHtmlTags(tdMatch[1]).trim())
        }

        if (cells.length > 0) {
          rows.push(cells)
        }
      }

      if (rows.length > 0) {
        tables.push({ rows })
      }
    }

    return tables
  }

  /**
   * Helper method to extract paragraphs from HTML
   * @private
   */
  _extractParagraphs(html) {
    const paragraphs = []
    const pRegex = /<p[^>]*>([^<]*)<\/p>/gi
    let match

    while ((match = pRegex.exec(html)) !== null) {
      const text = this._stripHtmlTags(match[1]).trim()
      if (text.length > 0) {
        paragraphs.push(text)
      }
    }

    return paragraphs
  }

  /**
   * Helper method to parse content into tickets
   * @private
   */
  _parseContentToTickets(documentContent, options) {
    const {
      priority,
      assignee,
      epic,
      ticketPrefix,
      ticketNumber
    } = options

    // Split content by double newlines or by numbered items
    const contentSections = documentContent
      .split(/\n\n+|\n\d+\.\s/)
      .filter(section => section.trim().length > 0)

    // If multiple sections, create one ticket per section; otherwise create single ticket
    const tickets = contentSections.length > 1
      ? contentSections.map((section, index) => ({
          id: `${ticketPrefix}-${ticketNumber + index}`,
          summary: this._extractSummary(section),
          description: section.trim(),
          priority,
          assignee,
          epic,
          acceptanceCriteria: this._extractAcceptanceCriteria(section),
          createdAt: new Date().toISOString()
        }))
      : [{
          id: `${ticketPrefix}-${ticketNumber}`,
          summary: this._extractSummary(documentContent),
          description: documentContent.trim(),
          priority,
          assignee,
          epic,
          acceptanceCriteria: this._extractAcceptanceCriteria(documentContent),
          createdAt: new Date().toISOString()
        }]

    return tickets
  }

  /**
   * Helper method to extract summary from content
   * @private
   */
  _extractSummary(content) {
    // Get first line or first 100 characters
    const lines = content.trim().split('\n')
    const summary = lines[0] || 'Untitled'
    return summary.substring(0, 100)
  }

  /**
   * Helper method to extract acceptance criteria from content
   * @private
   */
  _extractAcceptanceCriteria(content) {
    const criteria = []
    const lines = content.split('\n')

    // Look for lines that might be acceptance criteria
    const acRegex = /^[\s]*(criteria|criterion|condition|requirement|accept|should|must|shall|given|when|then)[\s:]/i

    for (const line of lines) {
      if (acRegex.test(line)) {
        const cleaned = line.replace(/^[\s\-•*]+/, '').trim()
        if (cleaned.length > 0) {
          criteria.push(cleaned)
        }
      }
    }

    return criteria.length > 0 ? criteria : []
  }

  /**
   * Analyze document content using AI to extract structured requirements
   * @param {string} documentContent - Plain text from document
   * @param {Object} options - Analysis options
   * @returns {Promise<Object>} AI-analyzed tickets with structure
   */
  async analyzeWithAI(documentContent, options = {}) {
    try {
      console.log('[DocumentParser] Starting AI analysis...')
      
      // 1. Structure detection (Story/Epic/Feature)
      const structure = await this.aiService.analyzeDocumentStructure(documentContent)
      
      if (structure.fallback || structure.confidence < 0.6) {
        console.warn('[DocumentParser] AI confidence low or unavailable, falling back to rule-based parsing')
        const fallbackTickets = this.convertToTickets(documentContent, options)
        return {
          tickets: fallbackTickets,
          epics: [],
          processFlow: null,
          strategicInsights: null,
          metadata: {
            aiPowered: false,
            fallback: true,
            reason: structure.error || 'Low confidence',
            confidence: structure.confidence
          }
        }
      }

      console.log(`[DocumentParser] AI analysis complete. Confidence: ${structure.confidence}`)
      console.log(`[DocumentParser] Found ${structure.epics?.length || 0} epics, ${structure.stories?.length || 0} stories, ${structure.features?.length || 0} features`)
      
      // 2. Convert AI structure to ticket format
      const tickets = this._convertAIStructureToTickets(structure, options)
      
      console.log('[DocumentParser] Starting strategic analysis...')
      // 3. Strategic analysis on generated tickets
      const strategicInsights = await this.aiService.performStrategicAnalysis(tickets)
      
      console.log('[DocumentParser] Starting process flow detection...')
      // 4. Process flow detection
      const processFlow = await this.aiService.detectProcessFlow(tickets)
      
      // 5. Merge all analysis results
      const enrichedTickets = tickets.map(ticket => ({
        ...ticket,
        _aiAnalysis: {
          structureConfidence: structure.confidence,
          strategicInsights: strategicInsights.executiveSummary || null,
          processRole: processFlow.steps?.find(s => s.ticketId === ticket.id)?.swimlane || null,
          aiGenerated: true
        }
      }))

      console.log('[DocumentParser] ✓ AI analysis pipeline complete')
      console.log('[DocumentParser] Cost stats:', this.aiService.getCostStats())

      return {
        tickets: enrichedTickets,
        epics: structure.epics || [],
        processFlow: processFlow,
        strategicInsights: strategicInsights,
        metadata: {
          aiPowered: true,
          confidence: structure.confidence,
          analysisComplete: true,
          summary: structure.summary || '',
          costStats: this.aiService.getCostStats()
        }
      }
    } catch (error) {
      console.error('[DocumentParser] AI analysis failed:', error.message)
      // Fallback to deterministic parsing
      const fallbackTickets = this.convertToTickets(documentContent, options)
      return {
        tickets: fallbackTickets,
        epics: [],
        processFlow: null,
        strategicInsights: null,
        metadata: {
          aiPowered: false,
          fallback: true,
          error: error.message
        }
      }
    }
  }

  /**
   * Convert AI-detected structure to ticket objects
   * @param {Object} structure - AI analysis structure
   * @param {Object} options - Ticket generation options
   * @returns {Array<Object>} Array of ticket objects
   * @private
   */
  _convertAIStructureToTickets(structure, options) {
    const { ticketPrefix = 'MVM', ticketNumber = 1000, priority = 'Medium', assignee = 'Unassigned' } = options
    const tickets = []
    let counter = 0

    // Process stories
    if (structure.stories && Array.isArray(structure.stories)) {
      structure.stories.forEach(story => {
        const storyId = `${ticketPrefix}-${ticketNumber + counter++}`
        tickets.push({
          id: storyId,
          type: 'Story',
          summary: story.persona ? `Mint ${story.persona}, ${story.goal}` : story.goal,
          description: story.value ? `Azért, hogy ${story.value}` : (story.description || ''),
          priority: story.priority || priority,
          assignee: assignee,
          epic: story.epic || 'No Epic',
          acceptanceCriteria: story.acceptanceCriteria || [],
          createdAt: new Date().toISOString(),
          _aiGenerated: true,
          _aiMetadata: {
            originalId: story.id,
            persona: story.persona,
            goal: story.goal,
            value: story.value
          }
        })
      })
    }

    // Process features
    if (structure.features && Array.isArray(structure.features)) {
      structure.features.forEach(feature => {
        const featureId = `${ticketPrefix}-${ticketNumber + counter++}`
        tickets.push({
          id: featureId,
          type: 'Feature',
          summary: feature.name,
          description: feature.description || '',
          priority: feature.priority || priority,
          assignee: assignee,
          epic: feature.epic || 'No Epic',
          acceptanceCriteria: feature.acceptanceCriteria || [],
          createdAt: new Date().toISOString(),
          _aiGenerated: true,
          _aiMetadata: {
            originalId: feature.id
          }
        })
      })
    }

    // Process tasks
    if (structure.tasks && Array.isArray(structure.tasks)) {
      structure.tasks.forEach(task => {
        const taskId = `${ticketPrefix}-${ticketNumber + counter++}`
        tickets.push({
          id: taskId,
          type: 'Task',
          summary: task.name,
          description: task.description || '',
          priority: priority,
          assignee: task.assignedTo || assignee,
          epic: 'No Epic',
          acceptanceCriteria: [],
          createdAt: new Date().toISOString(),
          _aiGenerated: true,
          _aiMetadata: {
            originalId: task.id
          }
        })
      })
    }

    // If no tickets generated, log warning
    if (tickets.length === 0) {
      console.warn('[DocumentParser] No tickets generated from AI structure. Structure:', JSON.stringify(structure, null, 2))
    }

    return tickets
  }
}

export default DocumentParser
