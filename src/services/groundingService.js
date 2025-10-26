/**
 * Grounding Service for AI Output Validation
 * Implements RAG (Retrieval-Augmented Generation) and fact-checking
 */

import { 
  BUSINESS_RULES, 
  VALIDATION_PATTERNS, 
  DOMAIN_KNOWLEDGE, 
  QUALITY_METRICS, 
  ERROR_MESSAGES 
} from '../config/knowledgeBase.js'

class GroundingService {
  constructor() {
    this.knowledgeBase = new Map()
    this.validationRules = new Map()
    this.sourceAttribution = new Map()
    this.initializeKnowledgeBase()
  }

  /**
   * Initialize knowledge base with business rules and validation patterns
   */
  initializeKnowledgeBase() {
    // Load business rules from configuration
    this.knowledgeBase.set('ticket_priorities', BUSINESS_RULES.PRIORITY_RULES.validPriorities)
    this.knowledgeBase.set('ticket_types', BUSINESS_RULES.TYPE_RULES.validTypes)
    this.knowledgeBase.set('assignee_patterns', BUSINESS_RULES.ASSIGNEE_RULES.validFormats)
    this.knowledgeBase.set('epic_patterns', BUSINESS_RULES.EPIC_RULES.validFormats)
    this.knowledgeBase.set('priority_mapping', BUSINESS_RULES.PRIORITY_RULES.priorityMapping)
    
    // Load validation patterns
    this.knowledgeBase.set('email_pattern', VALIDATION_PATTERNS.EMAIL)
    this.knowledgeBase.set('phone_pattern', VALIDATION_PATTERNS.PHONE)
    this.knowledgeBase.set('date_formats', VALIDATION_PATTERNS.DATE_FORMATS)
    this.knowledgeBase.set('id_formats', VALIDATION_PATTERNS.ID_FORMATS)
    this.knowledgeBase.set('text_patterns', VALIDATION_PATTERNS.TEXT_PATTERNS)
    
    // Load domain knowledge
    this.knowledgeBase.set('mvm_context', DOMAIN_KNOWLEDGE.MVM_CONTEXT)
    this.knowledgeBase.set('ba_context', DOMAIN_KNOWLEDGE.BA_CONTEXT)
    this.knowledgeBase.set('technical_context', DOMAIN_KNOWLEDGE.TECHNICAL_CONTEXT)
    
    // Load validation rules from configuration
    this.validationRules.set('summary', BUSINESS_RULES.CONTENT_RULES.summary)
    this.validationRules.set('description', BUSINESS_RULES.CONTENT_RULES.description)
    this.validationRules.set('acceptance_criteria', BUSINESS_RULES.CONTENT_RULES.acceptanceCriteria)
    
    // Load quality metrics
    this.validationRules.set('confidence_weights', QUALITY_METRICS.CONFIDENCE_WEIGHTS)
    this.validationRules.set('thresholds', QUALITY_METRICS.THRESHOLDS)
  }

  /**
   * Validate AI-generated ticket against knowledge base
   * @param {Object} ticket - Generated ticket
   * @param {Object} sourceData - Original Excel data
   * @returns {Object} Validation result with confidence score
   */
  validateTicket(ticket, sourceData) {
    const validation = {
      isValid: true,
      confidence: 1.0,
      issues: [],
      sources: [],
      warnings: []
    }

    // Validate priority
    if (!this.knowledgeBase.get('ticket_priorities').includes(ticket.priority)) {
      validation.issues.push(`Invalid priority: ${ticket.priority}`)
      validation.confidence -= 0.2
    }

    // Validate summary length
    const summaryRules = this.validationRules.get('summary_length')
    if (ticket.summary.length < summaryRules.min || ticket.summary.length > summaryRules.max) {
      validation.issues.push(`Summary length invalid: ${ticket.summary.length} chars`)
      validation.confidence -= 0.1
    }

    // Validate assignee format
    const assigneePatterns = this.knowledgeBase.get('assignee_patterns')
    const isValidAssignee = assigneePatterns.some(pattern => pattern.test(ticket.assignee))
    if (!isValidAssignee && ticket.assignee !== 'Unassigned') {
      validation.warnings.push(`Assignee format may be invalid: ${ticket.assignee}`)
      validation.confidence -= 0.05
    }

    // Validate epic format
    const epicPatterns = this.knowledgeBase.get('epic_patterns')
    const isValidEpic = epicPatterns.some(pattern => pattern.test(ticket.epic))
    if (!isValidEpic && ticket.epic !== 'No Epic') {
      validation.warnings.push(`Epic format may be invalid: ${ticket.epic}`)
      validation.confidence -= 0.05
    }

    // Check for hallucinated data
    const hallucinationCheck = this.detectHallucination(ticket, sourceData)
    if (hallucinationCheck.detected) {
      validation.issues.push(`Potential hallucination: ${hallucinationCheck.reason}`)
      validation.confidence -= 0.3
    }

    // Add source attribution
    validation.sources.push({
      type: 'excel_data',
      timestamp: new Date().toISOString(),
      row: sourceData.rowIndex
    })

    validation.isValid = validation.confidence > 0.7
    return validation
  }

  /**
   * Detect potential hallucinations in AI output
   * @param {Object} ticket - Generated ticket
   * @param {Object} sourceData - Original data
   * @returns {Object} Hallucination detection result
   */
  detectHallucination(ticket, sourceData) {
    const detection = {
      detected: false,
      reason: '',
      confidence: 0
    }

    // Check for fabricated IDs
    if (ticket.id && !ticket.id.startsWith('MVM-')) {
      detection.detected = true
      detection.reason = 'Ticket ID format mismatch'
      detection.confidence = 0.9
      return detection
    }

    // Check for unrealistic acceptance criteria
    if (ticket.acceptanceCriteria && ticket.acceptanceCriteria.length > 10) {
      detection.detected = true
      detection.reason = 'Excessive acceptance criteria count'
      detection.confidence = 0.7
      return detection
    }

    // Check for fabricated timestamps
    const createdAt = new Date(ticket.createdAt)
    const now = new Date()
    if (createdAt > now || createdAt < new Date(now.getTime() - 24 * 60 * 60 * 1000)) {
      detection.detected = true
      detection.reason = 'Suspicious timestamp'
      detection.confidence = 0.6
      return detection
    }

    return detection
  }

  /**
   * Enhance ticket with grounded information
   * @param {Object} ticket - Original ticket
   * @param {Object} sourceData - Source Excel data
   * @returns {Object} Enhanced ticket with grounding metadata
   */
  enhanceWithGrounding(ticket, sourceData) {
    const validation = this.validateTicket(ticket, sourceData)
    
    return {
      ...ticket,
      _grounding: {
        validated: validation.isValid,
        confidence: validation.confidence,
        issues: validation.issues,
        warnings: validation.warnings,
        sources: validation.sources,
        timestamp: new Date().toISOString(),
        version: '1.0.0'
      }
    }
  }

  /**
   * Get grounding statistics
   * @returns {Object} Grounding metrics
   */
  getGroundingStats() {
    return {
      knowledgeBaseSize: this.knowledgeBase.size,
      validationRulesCount: this.validationRules.size,
      supportedFormats: {
        priorities: this.knowledgeBase.get('ticket_priorities'),
        types: this.knowledgeBase.get('ticket_types')
      },
      lastUpdated: new Date().toISOString()
    }
  }
}

export default GroundingService
