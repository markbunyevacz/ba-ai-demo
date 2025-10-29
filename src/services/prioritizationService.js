import { BUSINESS_RULES } from '../config/knowledgeBase.js'

const DEFAULT_ORDER = ['Must have', 'Should have', 'Could have', "Won't have"]

const BASE_SCORES = {
  'Must have': 90,
  'Should have': 70,
  'Could have': 45,
  "Won't have": 15
}

class PrioritizationService {
  constructor() {
    const rules = BUSINESS_RULES?.PRIORITY_RULES || {}

    this.categories = Array.isArray(rules.moscowCategories) && rules.moscowCategories.length > 0
      ? rules.moscowCategories
      : DEFAULT_ORDER

    this.priorityMapping = rules.priorityMapping || {}
    this.moscowMapping = rules.moscowMapping || { default: {} }
    this.keywordSignals = rules.keywordSignals || {}
    this.weights = rules.classificationWeights || {
      businessValue: 0.3,
      urgency: 0.25,
      risk: 0.25,
      dependencies: 0.1,
      stakeholderImpact: 0.1
    }
  }

  getCategories() {
    return [...this.categories]
  }

  getCategoryOrder() {
    return this.categories.length === DEFAULT_ORDER.length
      ? [...DEFAULT_ORDER]
      : [...this.categories]
  }

  normalizeCategory(value = '') {
    if (!value) return null

    const normalized = String(value).trim().toLowerCase()

    if (!normalized) return null

    const synonym = this.moscowMapping?.synonyms?.[normalized]
    if (synonym) return synonym

    const match = this.categories.find(category => category.toLowerCase() === normalized)
    if (match) return match

    const mapped = this.priorityMapping[normalized]
    if (mapped && this.moscowMapping?.default?.[mapped]) {
      return this.moscowMapping.default[mapped]
    }

    return null
  }

  normalizePriority(priority = '') {
    if (!priority) return ''
    const value = String(priority).trim()
    if (!value) return ''

    const mapped = this.priorityMapping[value]
    if (mapped) return mapped

    const key = Object.keys(this.priorityMapping).find(k => k.toLowerCase() === value.toLowerCase())
    if (key) {
      return this.priorityMapping[key]
    }

    return value
  }

  getBaseCategoryFromPriority(priority = '') {
    const normalizedPriority = this.normalizePriority(priority)
    const base = this.moscowMapping?.default?.[normalizedPriority]
    if (base) return base

    // If the priority already looks like a category, return normalized form
    const category = this.normalizeCategory(priority)
    if (category) return category

    return 'Should have'
  }

  calculateScore(ticket = {}, baseCategory) {
    const breakdown = {
      base: BASE_SCORES[baseCategory] ?? BASE_SCORES['Should have'],
      businessValue: 0,
      urgency: 0,
      risk: 0,
      dependencies: 0,
      stakeholderImpact: 0,
      keywordBoost: 0
    }

    const contributions = []

    // Business value heuristics
    const businessValue = this.normalizeNumeric(ticket.businessValue ?? ticket.valueScore)
    if (businessValue !== null) {
      breakdown.businessValue = businessValue * this.weights.businessValue
      contributions.push({ type: 'businessValue', value: breakdown.businessValue })
    }

    // Urgency based on due date compared to today
    const urgencyScore = this.calculateUrgency(ticket.dueDate || ticket.targetDate)
    breakdown.urgency = urgencyScore * this.weights.urgency
    if (breakdown.urgency) {
      contributions.push({ type: 'urgency', value: breakdown.urgency })
    }

    // Risk heuristic (higher risk => higher priority)
    const riskScore = this.normalizeNumeric(ticket.riskScore ?? ticket.riskLevel, { invert: false })
    if (riskScore !== null) {
      breakdown.risk = riskScore * this.weights.risk
      contributions.push({ type: 'risk', value: breakdown.risk })
    }

    // Dependencies
    const dependencyScore = this.calculateDependencyScore(ticket.dependencies || ticket.dependentTickets)
    breakdown.dependencies = dependencyScore * this.weights.dependencies
    if (breakdown.dependencies) {
      contributions.push({ type: 'dependencies', value: breakdown.dependencies })
    }

    // Stakeholder impact (e.g., count of stakeholders flagged as high power/interest)
    const impactScore = this.calculateStakeholderImpact(ticket.stakeholderImpact || ticket.stakeholders)
    breakdown.stakeholderImpact = impactScore * this.weights.stakeholderImpact
    if (breakdown.stakeholderImpact) {
      contributions.push({ type: 'stakeholderImpact', value: breakdown.stakeholderImpact })
    }

    // Keyword signals boost or pull
    const keywordBoost = this.calculateKeywordBoost(ticket)
    breakdown.keywordBoost = keywordBoost
    if (keywordBoost !== 0) {
      contributions.push({ type: 'keywords', value: keywordBoost })
    }

    const totalScore = Object.values(breakdown).reduce((sum, value) => sum + value, 0)

    return {
      score: Math.max(0, Math.min(100, Number(totalScore.toFixed(2)))),
      breakdown,
      contributions
    }
  }

  normalizeNumeric(value, options = {}) {
    if (value === null || value === undefined) return null

    const numeric = Number(value)
    if (Number.isNaN(numeric)) return null

    const clamped = Math.max(0, Math.min(100, numeric))

    if (options.invert) {
      return 100 - clamped
    }

    return clamped
  }

  calculateUrgency(dueDate) {
    if (!dueDate) return 0
    const due = new Date(dueDate)
    if (Number.isNaN(due.getTime())) return 0

    const now = new Date()
    const diffDays = (due - now) / (1000 * 60 * 60 * 24)

    if (diffDays <= 0) return 100
    if (diffDays <= 2) return 90
    if (diffDays <= 7) return 75
    if (diffDays <= 14) return 60
    if (diffDays <= 30) return 45
    return 25
  }

  calculateDependencyScore(dependencies) {
    if (!dependencies) return 0

    if (Array.isArray(dependencies)) {
      if (dependencies.length === 0) return 0
      return Math.min(100, 40 + dependencies.length * 10)
    }

    if (typeof dependencies === 'number') {
      return Math.min(100, dependencies * 10)
    }

    return 0
  }

  calculateStakeholderImpact(stakeholders) {
    if (!stakeholders || stakeholders.length === 0) return 0

    if (!Array.isArray(stakeholders)) return 0

    const influential = stakeholders.filter(stakeholder => {
      const power = stakeholder.power || stakeholder.influence || stakeholder.level
      if (typeof power === 'number') {
        return power >= 7
      }
      if (typeof power === 'string') {
        return ['high', 'critical'].includes(power.toLowerCase())
      }
      return false
    })

    if (influential.length === 0) return 30

    return Math.min(100, 50 + influential.length * 10)
  }

  calculateKeywordBoost(ticket) {
    const text = [ticket.summary, ticket.description, ticket.category, ticket.comments]
      .flat()
      .filter(Boolean)
      .join(' ')
      .toLowerCase()

    if (!text) return 0

    const signals = this.keywordSignals
    let boost = 0

    const countMatches = (keywords = []) => keywords.reduce((count, keyword) => (
      text.includes(keyword.toLowerCase()) ? count + 1 : count
    ), 0)

    const mustCount = countMatches(signals.must)
    const shouldCount = countMatches(signals.should)
    const couldCount = countMatches(signals.could)
    const wontCount = countMatches(signals.wont)

    boost += mustCount * 8
    boost += shouldCount * 5
    boost += couldCount * 2
    boost -= wontCount * 6

    return boost
  }

  determineCategory(score) {
    if (score >= 85) return 'Must have'
    if (score >= 65) return 'Should have'
    if (score >= 40) return 'Could have'
    return "Won't have"
  }

  classifyTicket(ticket = {}, options = {}) {
    const baseCategory = this.getBaseCategoryFromPriority(ticket.priority)
    const { score, breakdown, contributions } = this.calculateScore(ticket, baseCategory)

    let category = this.determineCategory(score)
    const normalizedOverride = this.normalizeCategory(options.forcedCategory)

    const reasoning = []

    if (normalizedOverride) {
      category = normalizedOverride
      reasoning.push('Manual override applied')
    } else if (category !== baseCategory) {
      reasoning.push(`Reclassified from ${baseCategory} to ${category} based on weighted signals`)
    } else {
      reasoning.push('Classification aligned with base priority mapping')
    }

    if (contributions.length > 0) {
      contributions
        .sort((a, b) => Math.abs(b.value) - Math.abs(a.value))
        .slice(0, 3)
        .forEach(({ type, value }) => {
          reasoning.push(`${type} contributed ${value.toFixed(1)} points`)
        })
    }

    const record = {
      category,
      baseCategory,
      score,
      breakdown,
      contributions,
      rationale: reasoning,
      manualOverride: Boolean(normalizedOverride),
      updatedAt: new Date().toISOString()
    }

    const enrichedTicket = {
      ...ticket,
      moscowClassification: category,
      _prioritization: record
    }

    return enrichedTicket
  }

  classifyTickets(tickets = []) {
    if (!Array.isArray(tickets) || tickets.length === 0) return []
    return tickets.map(ticket => this.classifyTicket(ticket))
  }

  validateCategory(category) {
    return Boolean(this.normalizeCategory(category))
  }

  updateClassification(tickets = [], ticketId, newCategory, context = {}) {
    if (!Array.isArray(tickets)) {
      throw new Error('Tickets must be an array to update classification')
    }

    const normalizedCategory = this.normalizeCategory(newCategory)
    if (!normalizedCategory) {
      throw new Error(`Invalid MoSCoW category: ${newCategory}`)
    }

    return tickets.map(ticket => {
      if ((ticket.id || ticket.ticketId) !== ticketId) {
        return ticket
      }

      const existingMeta = ticket._prioritization || {}

      return {
        ...ticket,
        moscowClassification: normalizedCategory,
        _prioritization: {
          ...existingMeta,
          category: normalizedCategory,
          manualOverride: true,
          overrideContext: {
            user: context.user || 'analyst',
            reason: context.reason || 'Manual adjustment',
            timestamp: new Date().toISOString()
          }
        }
      }
    })
  }

  getPortfolioSummary(tickets = []) {
    if (!Array.isArray(tickets) || tickets.length === 0) {
      return {
        total: 0,
        categories: {},
        completion: 0,
        riskAlerts: [],
        readiness: 'N/A'
      }
    }

    const categories = {}
    const alerts = []

    tickets.forEach(ticket => {
      const category = this.normalizeCategory(ticket.moscowClassification) || this.getBaseCategoryFromPriority(ticket.priority)

      if (!categories[category]) {
        categories[category] = {
          count: 0,
          averageScore: 0,
          cumulativeScore: 0,
          tickets: []
        }
      }

      const score = ticket._prioritization?.score ?? BASE_SCORES[category]

      categories[category].count += 1
      categories[category].cumulativeScore += score
      categories[category].tickets.push(ticket.id || ticket.summary || `Ticket-${categories[category].count}`)

      if (category === 'Must have' && ticket._prioritization?.breakdown?.risk > 15) {
        alerts.push({
          type: 'risk',
          ticketId: ticket.id,
          message: 'High risk Must have item detected',
          score: ticket._prioritization.breakdown.risk
        })
      }
    })

    Object.keys(categories).forEach(category => {
      const data = categories[category]
      data.averageScore = Number((data.cumulativeScore / data.count).toFixed(2))
    })

    const mustRatio = (categories['Must have']?.count || 0) / tickets.length
    const readiness = mustRatio > 0.4 ? 'High pressure' : mustRatio > 0.25 ? 'Balanced' : 'Comfortable'

    const completion = Number(((categories['Must have']?.count || 0) / Math.max(1, tickets.length) * 100).toFixed(1))

    return {
      total: tickets.length,
      categories,
      completion,
      riskAlerts: alerts,
      readiness
    }
  }
}

const prioritizationService = new PrioritizationService()

export { PrioritizationService }
export default prioritizationService


