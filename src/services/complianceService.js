import { STANDARDS_COMPLIANCE, ERROR_MESSAGES } from '../config/knowledgeBase.js'

const DEFAULT_THRESHOLDS = {
  compliant: 0.8,
  caution: 0.6
}

const TEXT_FIELDS = ['summary', 'description', 'acceptanceCriteria', 'comments', 'epic', 'category']

class ComplianceService {
  constructor() {
    const registryEntries = Object.entries(STANDARDS_COMPLIANCE || {})
      .filter(([key]) => key !== 'thresholds')

    this.registry = new Map(
      registryEntries.map(([key, config]) => {
        const id = config.id || key
        return [id, { id, ...config }]
      })
    )

    this.thresholds = STANDARDS_COMPLIANCE?.thresholds || DEFAULT_THRESHOLDS
    this.validationMessages = ERROR_MESSAGES?.VALIDATION || {}
    this.systemMessages = ERROR_MESSAGES?.SYSTEM || {}
  }

  getAvailableStandards() {
    return Array.from(this.registry.values()).map(standard => ({
      id: standard.id,
      name: standard.name,
      description: standard.description
    }))
  }

  getStandard(id) {
    return this.registry.get(id)
  }

  evaluateTicket(ticket = {}, options = {}) {
    if (!ticket) {
      throw new Error('Ticket is required for compliance evaluation')
    }

    const standardsToCheck = this.resolveStandards(options.standards)

    const standardResults = standardsToCheck.map(id => this.assessStandard(id, ticket))

    const overallScore = standardResults.length > 0
      ? Number((standardResults.reduce((sum, item) => sum + item.score, 0) / standardResults.length).toFixed(2))
      : 0

    return {
      ticketId: ticket.id || ticket.ticketId || ticket.summary || 'unknown-ticket',
      overallScore,
      status: this.determineStatus(overallScore),
      standards: standardResults
    }
  }

  evaluateTickets(tickets = [], options = {}) {
    if (!Array.isArray(tickets)) {
      throw new Error('Tickets must be provided as an array for compliance evaluation')
    }

    return tickets.map(ticket => this.evaluateTicket(ticket, options))
  }

  generateReport(tickets = [], options = {}) {
    const evaluations = this.evaluateTickets(tickets, options)

    if (evaluations.length === 0) {
      return {
        totalTickets: 0,
        averageScore: 0,
        standardBreakdown: {},
        nonCompliantTickets: [],
        timestamp: new Date().toISOString()
      }
    }

    const standardBreakdown = {}

    evaluations.forEach(result => {
      result.standards.forEach(standard => {
        if (!standardBreakdown[standard.id]) {
          standardBreakdown[standard.id] = {
            averageScore: 0,
            complianceRate: 0,
            evaluated: 0,
            compliantCount: 0
          }
        }

        const entry = standardBreakdown[standard.id]
        entry.averageScore += standard.score
        entry.evaluated += 1
        if (standard.status === 'compliant') {
          entry.compliantCount += 1
        }
      })
    })

    Object.keys(standardBreakdown).forEach(id => {
      const entry = standardBreakdown[id]
      if (entry.evaluated > 0) {
        entry.averageScore = Number((entry.averageScore / entry.evaluated).toFixed(2))
        entry.complianceRate = Number((entry.compliantCount / entry.evaluated).toFixed(2))
      }
    })

    const nonCompliantTickets = evaluations
      .filter(result => result.status !== 'compliant')
      .map(result => ({
        ticketId: result.ticketId,
        status: result.status,
        overallScore: result.overallScore,
        gaps: result.standards.flatMap(standard => standard.gaps || [])
      }))

    const averageScore = Number((evaluations.reduce((sum, item) => sum + item.overallScore, 0) / evaluations.length).toFixed(2))

    return {
      totalTickets: evaluations.length,
      averageScore,
      standardBreakdown,
      nonCompliantTickets,
      timestamp: new Date().toISOString()
    }
  }

  assessStandard(id, ticket) {
    switch (id) {
      case 'PMI':
        return this.assessPMI(ticket)
      case 'BABOK':
        return this.assessBABOK(ticket)
      default:
        return {
          id,
          name: id,
          score: 0,
          status: 'not-evaluated',
          warnings: [{
            message: this.systemMessages.VALIDATION_ERROR || `Standard ${id} not supported`,
            standard: id
          }]
        }
    }
  }

  assessPMI(ticket) {
    const standard = this.getStandard('PMI')
    if (!standard) {
      return this.unsupportedStandard('PMI')
    }

    const coverage = {}
    const warnings = []
    const gaps = []

    let totalFields = 0
    let satisfiedFields = 0

    Object.entries(standard.processGroups || {}).forEach(([groupKey, config]) => {
      const requiredFields = config?.requiredFields || []
      const matched = requiredFields.filter(field => this.hasValue(ticket, field))
      const missing = requiredFields.filter(field => !matched.includes(field))

      totalFields += requiredFields.length
      satisfiedFields += matched.length

      coverage[groupKey] = {
        required: requiredFields,
        satisfied: matched,
        missing,
        completion: requiredFields.length > 0 ? matched.length / requiredFields.length : 1,
        keywordHits: this.countKeywordHits(config?.keywords, ticket)
      }

      missing.forEach(field => {
        warnings.push(this.buildWarning(field, 'PMI', groupKey))
        gaps.push({ field, group: groupKey, message: this.buildGapMessage(field, standard.recommendations) })
      })
    })

    const processScore = totalFields > 0 ? satisfiedFields / totalFields : 1

    const knowledgeAreas = {}
    let knowledgeScoreAggregate = 0
    let knowledgeWeightTotal = 0

    Object.entries(standard.knowledgeAreas || {}).forEach(([areaKey, config]) => {
      const weight = config.weight || 0.1
      const indicatorScore = this.calculateIndicatorScore(ticket, config.fields)
      const keywordScore = this.countKeywordHits(config.keywords, ticket) > 0 ? 1 : 0
      const combinedScore = Math.min(1, indicatorScore * 0.7 + keywordScore * 0.3)

      knowledgeAreas[areaKey] = {
        score: Number(combinedScore.toFixed(2)),
        weight,
        satisfiedFields: this.getSatisfiedFields(ticket, config.fields)
      }

      knowledgeScoreAggregate += combinedScore * weight
      knowledgeWeightTotal += weight
    })

    const knowledgeScore = knowledgeWeightTotal > 0 ? knowledgeScoreAggregate / knowledgeWeightTotal : processScore
    const score = Number(((processScore + knowledgeScore) / 2).toFixed(2))

    const status = this.determineStatus(score)

    if (score < this.thresholds.caution) {
      warnings.push({
        standard: 'PMI',
        message: standard.recommendations?.missingSchedule || 'Provide schedule and planning information to satisfy PMI planning expectations.'
      })
    }

    return {
      id: standard.id,
      name: standard.name,
      score,
      status,
      coverage,
      knowledgeAreas,
      warnings,
      gaps
    }
  }

  assessBABOK(ticket) {
    const standard = this.getStandard('BABOK')
    if (!standard) {
      return this.unsupportedStandard('BABOK')
    }

    const areas = {}
    const warnings = []
    const gaps = []

    let aggregateScore = 0
    let aggregateWeight = 0

    Object.entries(standard.knowledgeAreas || {}).forEach(([areaKey, config]) => {
      const keywordScore = this.countKeywordHits(config.keywords, ticket) > 0 ? 1 : 0
      const indicatorScore = this.calculateIndicatorScore(ticket, config.indicators)
      const weight = config.weight || 0.16

      const combinedScore = Number((Math.min(1, (keywordScore * 0.5) + (indicatorScore * 0.5))).toFixed(2))

      areas[areaKey] = {
        score: combinedScore,
        weight,
        indicators: this.getSatisfiedFields(ticket, config.indicators)
      }

      if (combinedScore < 0.5) {
        warnings.push({
          standard: 'BABOK',
          knowledgeArea: areaKey,
          message: this.buildBabokRecommendation(areaKey, standard.recommendations)
        })

        gaps.push({ area: areaKey, message: this.buildBabokRecommendation(areaKey, standard.recommendations) })
      }

      aggregateScore += combinedScore * weight
      aggregateWeight += weight
    })

    const averagedScore = aggregateWeight > 0 ? Number((aggregateScore / aggregateWeight).toFixed(2)) : 0

    const deliverableCoverage = {}

    Object.entries(standard.deliverables || {}).forEach(([deliverable, fields]) => {
      const satisfied = this.getSatisfiedFields(ticket, fields)
      const completion = fields.length > 0 ? satisfied.length / fields.length : 1
      deliverableCoverage[deliverable] = {
        fields,
        satisfied,
        completion
      }

      if (completion < 1) {
        gaps.push({ deliverable, message: this.buildDeliverableGap(deliverable, fields, standard.recommendations) })
      }
    })

    const status = this.determineStatus(averagedScore)

    return {
      id: standard.id,
      name: standard.name,
      score: averagedScore,
      status,
      knowledgeAreas: areas,
      deliverables: deliverableCoverage,
      warnings,
      gaps
    }
  }

  unsupportedStandard(id) {
    return {
      id,
      name: id,
      score: 0,
      status: 'not-evaluated',
      warnings: [{
        standard: id,
        message: this.systemMessages.VALIDATION_ERROR || `Standard ${id} not configured`
      }]
    }
  }

  resolveStandards(requested) {
    if (!requested || requested.length === 0) {
      return Array.from(this.registry.keys())
    }

    return requested
      .filter(id => this.registry.has(id))
      .map(id => String(id))
  }

  determineStatus(score) {
    if (score >= this.thresholds.compliant) return 'compliant'
    if (score >= this.thresholds.caution) return 'partial'
    return 'gap'
  }

  hasValue(ticket, field) {
    const value = ticket[field]
    if (value === undefined || value === null) return false

    if (Array.isArray(value)) {
      return value.length > 0
    }

    if (typeof value === 'object') {
      return Object.keys(value).length > 0
    }

    return String(value).trim().length > 0
  }

  calculateIndicatorScore(ticket, fields = []) {
    if (!fields || fields.length === 0) return 1
    const satisfied = fields.filter(field => this.hasValue(ticket, field))
    return satisfied.length / fields.length
  }

  getSatisfiedFields(ticket, fields = []) {
    return fields.filter(field => this.hasValue(ticket, field))
  }

  countKeywordHits(keywords = [], ticket = {}) {
    if (!keywords || keywords.length === 0) return 0
    const text = this.collectTicketText(ticket)
    if (!text) return 0

    return keywords.reduce((hits, keyword) => (
      text.includes(keyword.toLowerCase()) ? hits + 1 : hits
    ), 0)
  }

  collectTicketText(ticket = {}) {
    return TEXT_FIELDS
      .map(field => ticket[field])
      .flat()
      .filter(Boolean)
      .map(value => String(value).toLowerCase())
      .join(' ')
  }

  buildWarning(field, standardId, groupKey) {
    return {
      field,
      standard: standardId,
      context: groupKey,
      message: this.getErrorMessageForField(field)
    }
  }

  getErrorMessageForField(field) {
    switch (field) {
      case 'summary':
        return this.validationMessages.SUMMARY_TOO_SHORT || 'Summary is missing or too short for compliance.'
      case 'description':
        return this.validationMessages.DESCRIPTION_TOO_SHORT || 'Description is required for compliance validation.'
      case 'acceptanceCriteria':
        return this.validationMessages.CRITERIA_TOO_LONG || 'Acceptance criteria missing or incomplete.'
      case 'assignee':
        return this.validationMessages.INVALID_ASSIGNEE || 'Assignee information required for resource planning.'
      case 'dueDate':
        return this.validationMessages.INVALID_EPIC || 'Due date or schedule information missing.'
      default:
        return this.systemMessages.VALIDATION_ERROR || `Missing required field: ${field}`
    }
  }

  buildGapMessage(field, recommendations = {}) {
    if (field === 'stakeholders') {
      return recommendations.missingStakeholders || 'Provide stakeholder list to satisfy PMI stakeholder management requirements.'
    }
    if (field === 'dueDate') {
      return recommendations.missingSchedule || 'Add schedule information to align with PMI planning guidance.'
    }
    if (field === 'risk') {
      return recommendations.missingRisk || 'Document risks and mitigations to comply with PMI risk management.'
    }
    if (field === 'acceptanceCriteria') {
      return recommendations.missingQuality || 'Specify acceptance or quality criteria to comply with PMI quality expectations.'
    }
    return `Add ${field} to strengthen PMI compliance.`
  }

  buildBabokRecommendation(areaKey, recommendations = {}) {
    switch (areaKey) {
      case 'planningMonitoring':
        return recommendations.missingValue || 'Capture business value and planning details for BABOK Planning & Monitoring.'
      case 'elicitationCollaboration':
        return recommendations.missingCollaboration || 'Record stakeholder insights to support BABOK Elicitation & Collaboration.'
      case 'requirementsLifecycle':
        return recommendations.missingTraceability || 'Maintain traceability and lifecycle data for BABOK Requirements Lifecycle.'
      case 'strategyAnalysis':
        return recommendations.missingValue || 'Provide strategy context or value statement for BABOK Strategy Analysis.'
      case 'requirementsAnalysis':
        return 'Detail requirements and models to satisfy BABOK Requirements Analysis & Design Definition.'
      case 'solutionEvaluation':
        return 'Define performance measures to comply with BABOK Solution Evaluation.'
      default:
        return 'Strengthen coverage for the referenced BABOK knowledge area.'
    }
  }

  buildDeliverableGap(deliverable, fields, recommendations = {}) {
    if (deliverable === 'valueAssessment') {
      return recommendations.missingValue || 'Include business value metrics to support BABOK value assessment deliverable.'
    }
    if (deliverable === 'requirementsTrace') {
      return recommendations.missingTraceability || 'Link requirements to epics or dependencies for BABOK traceability.'
    }
    if (deliverable === 'stakeholderMatrix') {
      return recommendations.missingCollaboration || 'Attach stakeholder matrix to evidence collaboration planning.'
    }
    return `Document fields ${fields.join(', ')} to complete BABOK deliverable ${deliverable}.`
  }
}

const complianceService = new ComplianceService()

export { ComplianceService }
export default complianceService


