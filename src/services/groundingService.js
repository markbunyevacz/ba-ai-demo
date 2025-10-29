/**
 * Grounding Service for AI Output Validation
 * Implements RAG (Retrieval-Augmented Generation) and fact-checking
 */

import { 
  BUSINESS_RULES, 
  VALIDATION_PATTERNS, 
  DOMAIN_KNOWLEDGE,
  STAKEHOLDER_ANALYSIS,
  QUALITY_METRICS, 
  ERROR_MESSAGES 
} from '../config/knowledgeBase.js'
import complianceService from './complianceService.js'

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
    const summaryRules = this.validationRules.get('summary') || BUSINESS_RULES.CONTENT_RULES.summary
    if (ticket.summary.length < summaryRules.minLength || ticket.summary.length > summaryRules.maxLength) {
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

    // Standards compliance validation
    try {
      const compliance = complianceService.evaluateTicket(ticket)
      validation.compliance = compliance

      if (compliance.status === 'gap') {
        validation.issues.push('Ticket fails PMI/BABOK compliance checks')
        validation.confidence -= 0.15
      } else if (compliance.status === 'partial') {
        validation.warnings.push('Ticket partially meets PMI/BABOK standards')
        validation.confidence -= 0.05
      }
    } catch (complianceError) {
      validation.warnings.push(`Compliance evaluation failed: ${complianceError.message}`)
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

  /**
   * Validate extracted stakeholder data
   * @param {Array} stakeholders - List of extracted stakeholders
   * @returns {Object} Validation result
   */
  validateStakeholders(stakeholders) {
    const validation = {
      valid: true,
      total: stakeholders.length,
      issues: [],
      warnings: [],
      hallucinations: []
    }

    if (!stakeholders || stakeholders.length === 0) {
      validation.warnings.push('No stakeholders extracted from tickets')
      return validation
    }

    const hallucConfig = STAKEHOLDER_ANALYSIS.halluccinationDetection

    stakeholders.forEach((stakeholder, index) => {
      // Validate name
      if (!stakeholder.name || stakeholder.name.trim().length === 0) {
        validation.issues.push(`Stakeholder ${index}: Missing or empty name`)
        validation.valid = false
      }

      // Validate name length
      if (stakeholder.name.length < hallucConfig.minNameLength) {
        validation.warnings.push(`Stakeholder ${stakeholder.name}: Name too short (possible abbreviation)`)
      }
      if (stakeholder.name.length > hallucConfig.maxNameLength) {
        validation.issues.push(`Stakeholder ${stakeholder.name}: Name too long (likely extraction error)`)
        validation.valid = false
      }

      // Validate power and interest levels
      if (!STAKEHOLDER_ANALYSIS.powerLevels.includes(stakeholder.power)) {
        validation.issues.push(`Stakeholder ${stakeholder.name}: Invalid power level '${stakeholder.power}'`)
        validation.valid = false
      }
      if (!STAKEHOLDER_ANALYSIS.interestLevels.includes(stakeholder.interest)) {
        validation.issues.push(`Stakeholder ${stakeholder.name}: Invalid interest level '${stakeholder.interest}'`)
        validation.valid = false
      }

      // Validate mentions exist
      if (!stakeholder.mentions || stakeholder.mentions.length === 0) {
        validation.issues.push(`Stakeholder ${stakeholder.name}: No mentions found (likely hallucination)`)
        validation.hallucinations.push({
          name: stakeholder.name,
          reason: 'No source mentions',
          confidence: 0.95
        })
        validation.valid = false
      }

      // Check for generic names
      if (hallucConfig.genericNames.includes(stakeholder.name)) {
        validation.warnings.push(`Stakeholder ${stakeholder.name}: Generic name (verify in source data)`)
      }

      // Check confidence for single-mention stakeholders
      if (stakeholder.frequency === 1 && (stakeholder.confidence || 0) < hallucConfig.minConfidenceForSingleMention) {
        validation.hallucinations.push({
          name: stakeholder.name,
          reason: 'Single mention with low confidence',
          confidence: 0.7,
          frequency: stakeholder.frequency
        })
      }
    })

    return validation
  }

  /**
   * Detect hallucinated stakeholders
   * @param {Array} stakeholders - List of extracted stakeholders
   * @param {Object} sourceData - Original source data
   * @returns {Object} Hallucination detection results
   */
  detectStakeholderHallucinations(stakeholders, sourceData) {
    const detection = {
      hallucinations: [],
      suspiciousPatterns: [],
      warnings: [],
      confidence: 0
    }

    if (!stakeholders || stakeholders.length === 0) {
      return detection
    }

    const hallucConfig = STAKEHOLDER_ANALYSIS.halluccinationDetection
    const genericNames = hallucConfig.genericNames

    stakeholders.forEach(stakeholder => {
      // Check for generic or fabricated names
      if (genericNames.includes(stakeholder.name)) {
        detection.hallucinations.push({
          name: stakeholder.name,
          type: 'generic_name',
          reason: 'Generic name detected',
          confidence: 0.6,
          suggestion: 'Verify stakeholder identity in source data'
        })
      }

      // Check for suspicious patterns
      if (stakeholder.name.includes(',') || stakeholder.name.includes('@')) {
        detection.suspiciousPatterns.push({
          name: stakeholder.name,
          pattern: 'Contains special characters',
          confidence: 0.8,
          suggestion: 'Likely extraction error - verify source'
        })
      }

      // Check for multiple spaces
      if (/\s{2,}/.test(stakeholder.name)) {
        detection.suspiciousPatterns.push({
          name: stakeholder.name,
          pattern: 'Multiple consecutive spaces',
          confidence: 0.6,
          suggestion: 'May indicate parsing issue'
        })
      }

      // Check for very high frequency without source attribution
      if (stakeholder.frequency > 20 && (!stakeholder.mentions || stakeholder.mentions.length === 0)) {
        detection.hallucinations.push({
          name: stakeholder.name,
          type: 'high_frequency_no_source',
          reason: 'High frequency but no source mentions',
          confidence: 0.85,
          suggestion: 'May be fabricated aggregate'
        })
      }

      // Check for low frequency (single mention)
      if (stakeholder.frequency === 1 && (stakeholder.confidence || 0) < 0.6) {
        detection.warnings.push({
          name: stakeholder.name,
          level: 'warning',
          message: 'Single mention with low confidence',
          confidence: 0.65,
          suggestion: 'May be a misextraction - verify in source'
        })
      }

      // Check for malformed email-like patterns
      if (/@[A-Za-z]/.test(stakeholder.name) && !/@(domain|company|email)/.test(stakeholder.name.toLowerCase())) {
        detection.suspiciousPatterns.push({
          name: stakeholder.name,
          pattern: 'Looks like email address',
          confidence: 0.7,
          suggestion: 'Extract actual name from email'
        })
      }

      // Check context mismatch
      if (stakeholder.type && stakeholder.mentions) {
        const allContexts = stakeholder.mentions.map(m => m.context || '').join(' ').toLowerCase()
        const type = stakeholder.type.toLowerCase()

        // If type is "Executive" but mentions are about implementation, flag it
        if (type.includes('executive') && (allContexts.includes('implement') || allContexts.includes('code') || allContexts.includes('debug'))) {
          detection.hallucinations.push({
            name: stakeholder.name,
            type: 'context_mismatch',
            reason: 'Stakeholder type contradicts context',
            confidence: 0.7,
            suggestion: `Expected ${stakeholder.type} role but context suggests technical implementation`
          })
        }
      }
    })

    // Calculate overall hallucination confidence
    detection.confidence = Math.min(
      1.0,
      (detection.hallucinations.length * 0.3 + detection.suspiciousPatterns.length * 0.2) / Math.max(stakeholders.length, 1)
    )

    return detection
  }

  /**
   * Validate stakeholder power/interest matrix
   * @param {Object} matrix - Power/interest matrix
   * @returns {Object} Validation result
   */
  validateStakeholderMatrix(matrix) {
    const validation = {
      valid: true,
      issues: [],
      warnings: []
    }

    if (!matrix) {
      validation.issues.push('Matrix data is missing')
      validation.valid = false
      return validation
    }

    // Validate structure
    const requiredQuadrants = ['highPowerHighInterest', 'highPowerLowInterest', 'lowPowerHighInterest', 'lowPowerLowInterest']
    requiredQuadrants.forEach(quadrant => {
      if (!Array.isArray(matrix[quadrant])) {
        validation.issues.push(`Missing or invalid quadrant: ${quadrant}`)
        validation.valid = false
      }
    })

    // Validate summary
    if (matrix.summary) {
      const total = matrix.summary.total || 0
      const byQuadrant = matrix.summary.byQuadrant || {}
      const sum = Object.values(byQuadrant).reduce((a, b) => a + b, 0)

      if (sum !== total) {
        validation.warnings.push(`Quadrant sum (${sum}) doesn't match total (${total})`)
      }
    }

    // Validate stakeholder distribution
    const totalStakeholders = Object.values(matrix).filter(Array.isArray).reduce((sum, arr) => sum + arr.length, 0)
    if (totalStakeholders === 0) {
      validation.warnings.push('Matrix contains no stakeholders')
    }

    return validation
  }
}

export default GroundingService
