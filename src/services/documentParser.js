import mammoth from 'mammoth'

/**
 * DocumentParser Service
 * Handles parsing and extraction of content from Word documents (.docx files)
 */
class DocumentParser {
  /**
   * Parse a Word document buffer and extract plain text
   * @param {Buffer} buffer - The .docx file buffer
   * @returns {Promise<string>} Plain text content from the document
   */
  async parseWordDocument(buffer) {
    try {
      const result = await mammoth.extractRawText({ arrayBuffer: buffer })
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
      const result = await mammoth.convertToHtml({ arrayBuffer: buffer })
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
      const result = await mammoth.convertToHtml({ arrayBuffer: buffer })
      
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
}

export default DocumentParser
