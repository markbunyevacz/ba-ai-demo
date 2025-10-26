/**
 * Strategic Analysis Service for PESTLE and SWOT
 * Generates strategic insights and recommendations from ticket content
 */

import {
  BUSINESS_RULES,
  STRATEGIC_ANALYSIS,
  QUALITY_METRICS,
  ERROR_MESSAGES
} from '../config/knowledgeBase.js'

class StrategicAnalysisService {
  constructor() {
    this.settings = BUSINESS_RULES.STRATEGIC_RULES
    this.pestleFactors = STRATEGIC_ANALYSIS.PESTLE_FACTORS
    this.swotCategories = STRATEGIC_ANALYSIS.SWOT_CATEGORIES
    this.templates = STRATEGIC_ANALYSIS.RECOMMENDATION_TEMPLATES
    this.confidenceThreshold = QUALITY_METRICS.THRESHOLDS.MIN_CONFIDENCE || 0.7
  }

  /**
   * Analyze ticket content and produce strategic metadata
   * @param {Object} ticket - Incoming ticket data
   * @returns {Object} Strategic analysis payload
   */
  analyzeTicket(ticket) {
    if (!ticket || typeof ticket !== 'object') {
      throw new Error(ERROR_MESSAGES.SYSTEM.PROCESSING_ERROR)
    }

    const normalizedTicket = {
      ...ticket,
      businessValue: ticket.businessValue || ticket.business_value || ticket.businessvalue
    }

    const text = this.composeText(normalizedTicket)
    const pestle = this.analyzePestle(text)
    const swot = this.buildSwotMatrix(pestle, text)
    const recommendations = this.generateRecommendations(pestle, swot)

    return {
      ...normalizedTicket,
      _strategic: {
        pestle,
        swot,
        recommendations,
        confidence: this.calculateOverallConfidence(pestle, swot),
        timestamp: new Date().toISOString(),
        version: '1.0.0'
      }
    }
  }

  /**
   * Compose textual corpus from ticket fields
   * @param {Object} ticket
   * @returns {string}
   */
  composeText(ticket) {
    const textParts = []

    const appendValue = value => {
      if (!value) return
      if (Array.isArray(value)) {
        const joined = value.filter(Boolean).join(' ')
        if (joined) textParts.push(joined)
        return
      }
      if (typeof value === 'string') {
        const trimmed = value.trim()
        if (trimmed) textParts.push(trimmed)
      }
    }

    appendValue(ticket.summary)
    appendValue(ticket.description)
    appendValue(ticket.businessValue)
    appendValue(ticket.acceptanceCriteria)

    return textParts.join(' ').toLowerCase()
  }

  /**
   * Analyze PESTLE factors within the text
   * @param {string} text
   * @returns {Object}
   */
  analyzePestle(text) {
    const factors = {}
    Object.entries(this.pestleFactors).forEach(([factor, config]) => {
      const riskSignals = this.extractSignals(text, config.riskKeywords)
      const opportunitySignals = this.extractSignals(text, config.opportunityKeywords)

      const factorData = {
        description: config.description,
        risks: riskSignals.slice(0, this.settings.pestle.maxSignalsPerFactor),
        opportunities: opportunitySignals.slice(0, this.settings.pestle.maxSignalsPerFactor),
        monitoringSignals: this.extractSignals(text, config.monitoringSignals),
        confidence: this.calculateConfidence(riskSignals.length, opportunitySignals.length)
      }

      factors[factor] = factorData
    })

    return factors
  }

  /**
   * Build SWOT matrix using PESTLE insights
   * @param {Object} pestle
   * @param {string} text
   * @returns {Object}
   */
  buildSwotMatrix(pestle, text) {
    const swot = {
      strengths: [],
      weaknesses: [],
      opportunities: [],
      threats: []
    }

    const maxItems = this.settings.swot.maxItemsPerCategory
    Object.entries(this.swotCategories).forEach(([category, config]) => {
      const matches = this.extractSignals(text, config.indicators)
      swot[category] = matches.slice(0, maxItems).map(signal => ({
        signal,
        sentiment: config.sentiment,
        confidence: this.deriveSignalConfidence(signal, pestle)
      }))
    })

    // Incorporate PESTLE signals into opportunities and threats
    Object.entries(pestle).forEach(([factor, data]) => {
      data.opportunities.forEach(signal => {
        if (swot.opportunities.length >= maxItems) return
        swot.opportunities.push({
          signal,
          factor,
          sentiment: 'positive',
          confidence: data.confidence
        })
      })
      data.risks.forEach(signal => {
        if (swot.threats.length >= maxItems) return
        swot.threats.push({
          signal,
          factor,
          sentiment: 'negative',
          confidence: data.confidence
        })
      })
    })

    return swot
  }

  /**
   * Generate strategic recommendations
   * @param {Object} pestle
   * @param {Object} swot
   * @returns {Array}
   */
  generateRecommendations(pestle, swot) {
    const recommendations = []
    const maxRecommendations = this.settings.recommendations.maxRecommendations

    // Risk mitigations from PESTLE threats
    Object.entries(pestle).forEach(([factor, data]) => {
      data.risks.forEach(signal => {
        if (recommendations.length >= maxRecommendations) return
        recommendations.push(this.formatRecommendation('mitigateRisk', { factor, signal }))
      })
    })

    // Opportunities from PESTLE opportunities
    Object.entries(pestle).forEach(([factor, data]) => {
      data.opportunities.forEach(signal => {
        if (recommendations.length >= maxRecommendations) return
        recommendations.push(this.formatRecommendation('pursueOpportunity', { factor, signal }))
      })
    })

    // Strengthen internal capabilities
    swot.strengths.forEach(item => {
      if (recommendations.length >= maxRecommendations) return
      recommendations.push(this.formatRecommendation('strengthenCapability', { capability: item.signal }))
    })

    // Ensure monitor recommendation if needed
    if (recommendations.length === 0) {
      recommendations.push(this.formatRecommendation('monitorChange', { factor: 'overall environment' }))
    }

    return recommendations
  }

  /**
   * Calculate overall strategic confidence
   * @param {Object} pestle
   * @param {Object} swot
   * @returns {number}
   */
  calculateOverallConfidence(pestle, swot) {
    const factorConfidences = Object.values(pestle).map(f => f.confidence)
    const swotConfidences = Object.values(swot).flat().map(item => item.confidence || 0)
    const allConfidences = [...factorConfidences, ...swotConfidences]

    if (allConfidences.length === 0) return this.settings.pestle.minConfidence

    const average = allConfidences.reduce((sum, value) => sum + value, 0) / allConfidences.length
    return Number(average.toFixed(2))
  }

  /**
   * Extract keyword signals
   * @param {string} text
   * @param {Array<string>} keywords
   * @returns {Array<string>}
   */
  extractSignals(text, keywords = []) {
    if (!text || keywords.length === 0) return []

    return keywords
      .filter(keyword => text.includes(keyword.toLowerCase()))
      .map(keyword => keyword)
  }

  /**
   * Calculate factor confidence from signal counts
   * @param {number} risks
   * @param {number} opportunities
   * @returns {number}
   */
  calculateConfidence(risks, opportunities) {
    const totalSignals = risks + opportunities
    if (totalSignals === 0) return this.settings.pestle.minConfidence

    const weightedScore = (opportunities * this.settings.pestle.opportunityWeight) + (risks * this.settings.pestle.riskWeight)
    const confidence = Math.min(1, weightedScore / (this.settings.pestle.maxSignalsPerFactor || totalSignals))
    return Number(Math.max(this.settings.pestle.minConfidence, confidence).toFixed(2))
  }

  /**
   * Derive confidence for a specific SWOT signal
   * @param {string} signal
   * @param {Object} pestle
   * @returns {number}
   */
  deriveSignalConfidence(signal, pestle) {
    const match = Object.values(pestle).find(factor =>
      factor.opportunities.includes(signal) || factor.risks.includes(signal)
    )

    return match ? match.confidence : this.settings.swot.minConfidence
  }

  /**
   * Format recommendation using templates
   * @param {string} templateKey
   * @param {Object} params
   * @returns {Object}
   */
  formatRecommendation(templateKey, params) {
    const template = this.templates[templateKey]
    const { urgency, impact, feasibility } = this.settings.recommendations.priorityWeights

    const priorityScore = Number(
      (urgency * this.scoreDimension(params.urgency || this.settings.recommendations.defaultUrgency) +
        impact * this.scoreDimension(params.impact || this.settings.recommendations.defaultImpact) +
        feasibility * this.scoreDimension(params.feasibility || this.settings.recommendations.defaultFeasibility)).toFixed(2)
    )

    return {
      action: template.replace(/{(\w+)}/g, (_, key) => params[key] || key),
      priorityScore,
      metadata: {
        template: templateKey,
        params,
        generatedAt: new Date().toISOString()
      }
    }
  }

  /**
   * Convert qualitative priority dimension into score
   * @param {string} level
   * @returns {number}
   */
  scoreDimension(level) {
    switch ((level || '').toLowerCase()) {
      case 'high':
        return 1
      case 'low':
        return 0.3
      case 'medium':
      default:
        return 0.6
    }
  }
}

export default StrategicAnalysisService

