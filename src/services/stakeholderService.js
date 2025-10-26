import { DOMAIN_KNOWLEDGE, BUSINESS_RULES } from '../config/knowledgeBase'

const POWER_SCORES = { Low: 1, Medium: 2, High: 3 }

class StakeholderService {
  constructor() {
    const stakeholderConfig = DOMAIN_KNOWLEDGE?.STAKEHOLDER_ANALYSIS || {}
    const baContext = DOMAIN_KNOWLEDGE?.BA_CONTEXT || {}

    this.extractionPatterns = stakeholderConfig.extractionPatterns || []
    this.roleMapping = stakeholderConfig.roleMapping || {}
    this.quadrantStrategies = stakeholderConfig.quadrantStrategies || {}
    this.powerKeywords = stakeholderConfig.powerKeywords || {}
    this.interestKeywords = stakeholderConfig.interestKeywords || {}
    this.hallucinationRules = stakeholderConfig.halluccinationDetection || {}
    this.networkSettings = stakeholderConfig.networkAnalysis || {}

    this.stakeholderTypes = new Set(baContext.stakeholders || [])
    this.assigneeRules = BUSINESS_RULES?.ASSIGNEE_RULES || {}
    this.stakeholders = new Map()
  }

  identifyStakeholders(tickets = []) {
    const profiles = new Map()

    tickets.forEach((ticket, index) => {
      const context = this.buildTicketContext(ticket)
      const extractedNames = this.extractNamesFromText(context)

      extractedNames.forEach(name => {
        const normalized = this.normalizeName(name)
        const profile = this.getOrCreateProfile(profiles, normalized, name, {
          context,
          role: this.inferRole(name, context)
        })

        profile.mentions.push({
          ticketId: ticket.id,
          index,
          source: 'extraction',
          context: context,
          snippet: this.getSnippet(context, name)
        })

        profile.frequency = profile.mentions.length
        this.updateEngagementMetrics(profile, { type: 'mention' })
      })

      if (ticket.assignee && ticket.assignee !== 'Unassigned') {
        const normalized = this.normalizeName(ticket.assignee)
        const profile = this.getOrCreateProfile(profiles, normalized, ticket.assignee, {
          role: ticket.assigneeRole || this.inferRole(ticket.assignee, context)
        })

        profile.assignments.push({
          ticketId: ticket.id,
          summary: ticket.summary || '',
          status: ticket.status || 'Unknown',
          team: ticket.assigneeTeam || null,
          role: ticket.assigneeRole || profile.type
        })

        profile.frequency = profile.mentions.length + profile.assignments.length
        this.updateEngagementMetrics(profile, { type: 'assignment' })
      }
    })

    const enrichedProfiles = Array.from(profiles.values()).map(profile => {
      const combinedContext = profile.mentions.map(m => m.context).join(' ')

      profile.power = this.determinePowerLevel(profile, combinedContext)
      profile.interest = this.determineInterestLevel(profile, combinedContext)
      profile.quadrant = this.getQuadrant(profile.power, profile.interest)
      profile.color = this.getQuadrantColor(profile.power, profile.interest)
      profile.engagementMetrics.activityScore = this.calculateActivityScore(profile)
      profile.influenceScore = this.calculateInfluenceScore(profile)
      profile.confidence = this.calculateConfidence(profile)
      profile.communicationPlan = this.buildCommunicationPlan(profile)
      profile.originalNames = Array.from(new Set(profile.originalNames))
      profile.roles = Array.from(new Set(profile.roles))
      profile.type = profile.roles[0] || profile.type

      return profile
    })

    this.stakeholders = new Map(enrichedProfiles.map(profile => [profile.id, profile]))
    return enrichedProfiles
  }

  buildTicketContext(ticket = {}) {
    const parts = [
      ticket.summary,
      ticket.description,
      Array.isArray(ticket.acceptanceCriteria) ? ticket.acceptanceCriteria.join(' ') : '',
      Array.isArray(ticket.comments) ? ticket.comments.join(' ') : '',
      ticket.assignee ? `Assignee: ${ticket.assignee}` : ''
    ]

    return parts.filter(Boolean).join(' ')
  }

  extractNamesFromText(text = '') {
    const candidates = new Set()

    if (!text || this.extractionPatterns.length === 0) {
      return []
    }

    this.extractionPatterns.forEach(pattern => {
      if (!(pattern instanceof RegExp)) return
      pattern.lastIndex = 0
      let match

      while ((match = pattern.exec(text)) !== null) {
        if (!match[1]) continue
        const matches = this.splitCandidateNames(match[1])
        matches.forEach(candidate => {
          if (this.isLikelyPersonName(candidate)) {
            candidates.add(candidate)
          }
        })
      }
    })

    return Array.from(candidates)
  }

  splitCandidateNames(raw = '') {
    return raw
      .split(/(?:,|&|\band\b|\+|\/)+/i)
      .map(name => name.trim())
      .filter(name => name.length > 0)
  }

  isLikelyPersonName(name = '') {
    const trimmed = name.trim()
    if (!trimmed) return false

    const { minNameLength, maxNameLength, genericNames, suspiciousPatterns } = this.hallucinationRules

    if (minNameLength && trimmed.length < minNameLength) return false
    if (maxNameLength && trimmed.length > maxNameLength) return false
    if (genericNames && genericNames.some(g => g.toLowerCase() === trimmed.toLowerCase())) return false

    if (Array.isArray(suspiciousPatterns) && suspiciousPatterns.length > 0) {
      const isSuspicious = suspiciousPatterns.some(pattern => {
        try {
          const regex = new RegExp(pattern, 'i')
          return regex.test(trimmed)
        } catch (error) {
          return false
        }
      })
      if (isSuspicious) return false
    }

    return true
  }

  getOrCreateProfile(store, normalized, name, metadata = {}) {
    if (!store.has(normalized)) {
      const role = metadata.role || 'Stakeholder'
      const profile = {
        id: normalized,
        name: this.formatName(name),
        originalNames: [name],
        roles: role ? [role] : [],
        type: role || 'Stakeholder',
        mentions: [],
        assignments: [],
        frequency: 0,
        confidence: 0,
        power: 'Medium',
        interest: 'Medium',
        quadrant: 'monitor',
        color: this.getQuadrantColor('Medium', 'Medium'),
        influenceScore: 0,
        engagementMetrics: {
          touchpoints: 0,
          assignments: 0,
          lastInteraction: null,
          lastAssignment: null,
          activityScore: 0,
          sentimentTrend: 'stable'
        },
        communicationPlan: null
      }

      store.set(normalized, profile)
    }

    const profile = store.get(normalized)

    if (metadata.role) {
      const resolvedRole = this.resolveRole(metadata.role)
      if (!profile.roles.includes(resolvedRole)) {
        profile.roles.push(resolvedRole)
        profile.type = profile.roles[0]
      }
    }

    if (!profile.originalNames.includes(name)) {
      profile.originalNames.push(name)
    }

    return profile
  }

  resolveRole(role) {
    if (!role) return 'Stakeholder'
    const normalized = role.trim().toLowerCase()

    const directMatch = Object.keys(this.roleMapping).find(key => key.toLowerCase() === normalized)
    if (directMatch) return directMatch

    const domainMatch = Array.from(this.stakeholderTypes).find(item => item.toLowerCase() === normalized)
    if (domainMatch) return domainMatch

    return role
      .split(/\s+/)
      .map(part => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
      .join(' ')
  }

  updateEngagementMetrics(profile, { type, timestamp } = {}) {
    if (!profile || !profile.engagementMetrics) return

    const metrics = profile.engagementMetrics
    const isoTimestamp = timestamp ? new Date(timestamp).toISOString() : new Date().toISOString()

    metrics.touchpoints = profile.mentions.length
    metrics.assignments = profile.assignments.length
    metrics.lastInteraction = isoTimestamp

    if (type === 'assignment') {
      metrics.lastAssignment = isoTimestamp
    }
  }

  determinePowerLevel(profile, combinedText = '') {
    for (const role of profile.roles) {
      const mapping = this.roleMapping[role]
      if (mapping?.power) {
        return mapping.power
      }
    }

    const text = `${profile.name} ${combinedText}`.toLowerCase()

    if (this.powerKeywords.high?.some(keyword => text.includes(keyword))) return 'High'
    if (this.powerKeywords.low?.some(keyword => text.includes(keyword))) return 'Low'

    return 'Medium'
  }

  determineInterestLevel(profile, combinedText = '') {
    for (const role of profile.roles) {
      const mapping = this.roleMapping[role]
      if (mapping?.interest) {
        return mapping.interest
      }
    }

    const text = combinedText.toLowerCase()

    if (this.interestKeywords.high?.some(keyword => text.includes(keyword))) return 'High'
    if (this.interestKeywords.low?.some(keyword => text.includes(keyword))) return 'Low'

    return 'Medium'
  }

  calculateActivityScore(profile) {
    const touchpointScore = Math.min(5, profile.mentions.length) * 0.2
    const assignmentScore = Math.min(5, profile.assignments.length) * 0.25
    const influenceScore = (POWER_SCORES[profile.power] || 1) * (POWER_SCORES[profile.interest] || 1) * 0.1
    const base = 1

    return Number((base + touchpointScore + assignmentScore + influenceScore).toFixed(2))
  }

  calculateInfluenceScore(profile) {
    const powerWeight = POWER_SCORES[profile.power] || 1
    const interestWeight = POWER_SCORES[profile.interest] || 1
    const interactionWeight = Math.log(profile.mentions.length + profile.assignments.length + 1)
    const engagement = profile.engagementMetrics?.activityScore || 0

    const influence = (powerWeight * 0.4) + (interestWeight * 0.3) + (interactionWeight * 0.2) + (engagement * 0.1)
    return Number(influence.toFixed(2))
  }

  calculateConfidence(profile) {
    const base = 0.45
    const mentionScore = Math.min(0.3, profile.mentions.length * 0.07)
    const assignmentScore = Math.min(0.15, profile.assignments.length * 0.05)
    const roleScore = profile.roles.some(role => this.roleMapping[role]) ? 0.08 : 0
    const confidence = Math.min(0.98, base + mentionScore + assignmentScore + roleScore)

    return Number(confidence.toFixed(2))
  }

  buildCommunicationPlan(profile) {
    const quadrantKey = profile.quadrant
    const strategyKey = quadrantKey?.replace('-', '_')
    const strategy = this.quadrantStrategies[strategyKey] || {}

    return {
      stakeholderId: profile.id,
      stakeholderName: profile.name,
      quadrant: quadrantKey,
      objective: strategy.description || 'Maintain appropriate engagement level',
      cadence: this.getCommunicationCadence(quadrantKey),
      channels: this.getCommunicationChannels(quadrantKey),
      owner: this.getEngagementOwner(quadrantKey, profile),
      keyMessages: strategy.strategies || [],
      successMetrics: {
        targetTouchpoints: quadrantKey === 'manage' ? 4 : quadrantKey === 'keep-satisfied' ? 3 : quadrantKey === 'keep-informed' ? 2 : 1,
        currentTouchpoints: profile.engagementMetrics.touchpoints,
        activityScore: profile.engagementMetrics.activityScore
      },
      color: profile.color
    }
  }

  getCommunicationCadence(quadrant) {
    switch (quadrant) {
      case 'manage':
        return 'Weekly'
      case 'keep-satisfied':
        return 'Bi-weekly'
      case 'keep-informed':
        return 'Monthly'
      default:
        return 'Quarterly'
    }
  }

  getCommunicationChannels(quadrant) {
    switch (quadrant) {
      case 'manage':
        return ['Workshops', 'One-on-One Sessions', 'Steering Committee']
      case 'keep-satisfied':
        return ['Executive Briefings', 'Email Summaries', 'Quarterly Reviews']
      case 'keep-informed':
        return ['Project Newsletter', 'Demo Sessions', 'Teams Updates']
      default:
        return ['Status Email', 'Quarterly Report']
    }
  }

  getEngagementOwner(quadrant, profile) {
    if (profile.roles.includes('Business Analyst')) {
      return 'Business Analysis Team'
    }

    switch (quadrant) {
      case 'manage':
        return 'Product Leadership'
      case 'keep-satisfied':
        return 'Executive Sponsor'
      case 'keep-informed':
        return 'Project Communications'
      default:
        return 'PMO'
    }
  }

  generatePowerInterestMatrix(stakeholders = null) {
    const data = stakeholders || Array.from(this.stakeholders.values())

    const matrix = {
      highPowerHighInterest: [],
      highPowerLowInterest: [],
      lowPowerHighInterest: [],
      lowPowerLowInterest: [],
      summary: {
        total: data.length,
        byQuadrant: {},
        byType: {},
        averagePower: 0,
        averageInterest: 0,
        engagement: {
          totalTouchpoints: 0,
          totalAssignments: 0,
          averageActivity: 0
        }
      }
    }

    let powerAccumulator = 0
    let interestAccumulator = 0
    let activityAccumulator = 0

    data.forEach(stakeholder => {
      const quadrant = stakeholder.quadrant || this.getQuadrant(stakeholder.power, stakeholder.interest)
      const activity = stakeholder.engagementMetrics?.activityScore || 0

      switch (quadrant) {
        case 'manage':
          matrix.highPowerHighInterest.push(stakeholder)
          break
        case 'keep-satisfied':
          matrix.highPowerLowInterest.push(stakeholder)
          break
        case 'keep-informed':
          matrix.lowPowerHighInterest.push(stakeholder)
          break
        default:
          matrix.lowPowerLowInterest.push(stakeholder)
      }

      matrix.summary.byType[stakeholder.type] = (matrix.summary.byType[stakeholder.type] || 0) + 1
      matrix.summary.engagement.totalTouchpoints += stakeholder.engagementMetrics?.touchpoints || 0
      matrix.summary.engagement.totalAssignments += stakeholder.engagementMetrics?.assignments || 0

      powerAccumulator += POWER_SCORES[stakeholder.power] || 0
      interestAccumulator += POWER_SCORES[stakeholder.interest] || 0
      activityAccumulator += activity
    })

    matrix.summary.byQuadrant = {
      manage: matrix.highPowerHighInterest.length,
      keep_satisfied: matrix.highPowerLowInterest.length,
      keep_informed: matrix.lowPowerHighInterest.length,
      monitor: matrix.lowPowerLowInterest.length
    }

    if (data.length > 0) {
      matrix.summary.averagePower = Number((powerAccumulator / data.length).toFixed(2))
      matrix.summary.averageInterest = Number((interestAccumulator / data.length).toFixed(2))
      matrix.summary.engagement.averageActivity = Number((activityAccumulator / data.length).toFixed(2))
    }

    return matrix
  }

  generateCommunicationPlans(stakeholders = null) {
    const data = stakeholders || Array.from(this.stakeholders.values())
    return data.map(stakeholder => stakeholder.communicationPlan || this.buildCommunicationPlan(stakeholder))
  }

  validateAssignments(tickets = [], stakeholders = null) {
    const stakeholderData = stakeholders || Array.from(this.stakeholders.values())
    const stakeholderIndex = new Map(stakeholderData.map(s => [this.normalizeName(s.name), s]))

    const { validFormats = [], requiredFields = [], teamAssignments = {} } = this.assigneeRules

    const results = {
      valid: true,
      errors: [],
      warnings: [],
      assignmentsChecked: []
    }

    tickets.forEach((ticket, index) => {
      const ticketId = ticket?.id || `ticket-${index + 1}`
      const entry = {
        ticketId,
        assignee: ticket?.assignee || 'Unassigned',
        status: 'valid',
        issues: []
      }

      if (!ticket?.assignee || ticket.assignee === 'Unassigned') {
        entry.status = 'warning'
        entry.issues.push('Missing assignee')
        results.warnings.push(`Ticket ${ticketId}: Missing assignee`)
        results.assignmentsChecked.push(entry)
        return
      }

      const assigneeName = ticket.assignee
      const normalized = this.normalizeName(assigneeName)
      const profile = stakeholderIndex.get(normalized)

      const formatMatches = validFormats.length === 0 || validFormats.some(pattern => {
        try {
          pattern.lastIndex = 0
        } catch (error) {
          // ignore patterns without lastIndex
        }
        return pattern.test(assigneeName)
      })

      if (!formatMatches) {
        entry.status = 'error'
        entry.issues.push('Assignee does not match required naming formats')
        results.errors.push(`Ticket ${ticketId}: Assignee "${assigneeName}" does not match valid formats`)
      }

      if (ticket.assigneeDetails) {
        requiredFields.forEach(field => {
          if (!ticket.assigneeDetails[field]) {
            entry.status = 'error'
            entry.issues.push(`Missing required field: ${field}`)
            results.errors.push(`Ticket ${ticketId}: Missing assignee field "${field}"`)
          }
        })
      } else if (requiredFields.length > 0) {
        entry.status = entry.status === 'error' ? 'error' : 'warning'
        entry.issues.push('Assignee details missing for required fields')
        results.warnings.push(`Ticket ${ticketId}: Assignee details missing (expected fields: ${requiredFields.join(', ')})`)
      }

      if (ticket.assigneeTeam && teamAssignments[ticket.assigneeTeam]) {
        const assigneeEmail = ticket.assigneeEmail || ticket.assigneeDetails?.email
        if (assigneeEmail && !teamAssignments[ticket.assigneeTeam].includes(assigneeEmail)) {
          entry.status = 'error'
          entry.issues.push('Assignee email not authorized for team assignment')
          results.errors.push(`Ticket ${ticketId}: Assignee email ${assigneeEmail} not authorized for team ${ticket.assigneeTeam}`)
        }
      }

      if (!profile) {
        entry.status = entry.status === 'error' ? 'error' : 'warning'
        entry.issues.push('Assignee not found in stakeholder analysis')
        results.warnings.push(`Ticket ${ticketId}: Assignee "${assigneeName}" not identified in stakeholder analysis`)
      } else if (ticket.assigneeRole) {
        const expectedRole = profile.type
        if (this.normalizeRole(ticket.assigneeRole) !== this.normalizeRole(expectedRole)) {
          entry.status = entry.status === 'error' ? 'error' : 'warning'
          entry.issues.push(`Role mismatch: ticket role "${ticket.assigneeRole}" vs stakeholder role "${expectedRole}"`)
          results.warnings.push(`Ticket ${ticketId}: Role mismatch for ${assigneeName} (${ticket.assigneeRole} vs ${expectedRole})`)
        }
      }

      if (entry.status === 'valid' && entry.issues.length === 0) {
        entry.status = 'valid'
      }

      results.assignmentsChecked.push(entry)
    })

    results.valid = results.errors.length === 0
    return results
  }

  analyzeInfluenceNetwork(stakeholders = null) {
    const data = stakeholders || Array.from(this.stakeholders.values())
    const { minEdgeWeight = 1, topRelationships = 50 } = this.networkSettings

    const nodes = data.map(profile => ({
      id: profile.id,
      label: profile.name,
      type: profile.type,
      power: profile.power,
      interest: profile.interest,
      frequency: profile.frequency,
      color: profile.color,
      size: Math.max(20, Math.min(50, 15 + profile.frequency * 5)),
      activityScore: profile.engagementMetrics?.activityScore || 0
    }))

    const edges = []
    const mentionsByTicket = new Map()

    data.forEach(profile => {
      profile.mentions.forEach(mention => {
        if (!mentionsByTicket.has(mention.ticketId)) {
          mentionsByTicket.set(mention.ticketId, new Set())
        }
        mentionsByTicket.get(mention.ticketId).add(profile.id)
      })
    })

    mentionsByTicket.forEach(stakeholdersInTicket => {
      const names = Array.from(stakeholdersInTicket)
      for (let i = 0; i < names.length; i += 1) {
        for (let j = i + 1; j < names.length; j += 1) {
          const existingEdge = edges.find(edge => (
            (edge.from === names[i] && edge.to === names[j]) ||
            (edge.from === names[j] && edge.to === names[i])
          ))

          if (existingEdge) {
            existingEdge.weight += 1
          } else {
            edges.push({ from: names[i], to: names[j], weight: 1 })
          }
        }
      }
    })

    const filteredEdges = edges
      .filter(edge => edge.weight >= minEdgeWeight)
      .sort((a, b) => b.weight - a.weight)
      .slice(0, topRelationships)

    return {
      nodes,
      edges: filteredEdges,
      network: {
        nodeCount: nodes.length,
        edgeCount: filteredEdges.length,
        density: nodes.length > 1 ? filteredEdges.length / (nodes.length * (nodes.length - 1) / 2) : 0,
        topInfluencers: this.getTopInfluencers(data)
      }
    }
  }

  getTopInfluencers(stakeholders) {
    return stakeholders
      .map(profile => ({
        ...profile,
        influenceComposite: (
          (POWER_SCORES[profile.power] || 1) *
          (POWER_SCORES[profile.interest] || 1) *
          (profile.engagementMetrics?.activityScore || 1)
        )
      }))
      .sort((a, b) => b.influenceComposite - a.influenceComposite)
      .slice(0, this.networkSettings.topInfluencers || 10)
      .map(({ influenceComposite, ...rest }) => rest)
  }

  getEngagementRecommendations(matrix) {
    const recommendations = []

    const addRecommendation = (key, stakeholders) => {
      if (!stakeholders || stakeholders.length === 0) return
      const strategy = this.quadrantStrategies[key] || {}
      const formattedKey = key.replace('_', '-')

      recommendations.push({
        quadrant: formattedKey,
        title: strategy.title || formattedKey,
        stakeholders,
        strategies: strategy.strategies || [],
        color: strategy.color || this.getQuadrantColor(
          formattedKey === 'keep-satisfied' ? 'High' : formattedKey === 'keep-informed' ? 'Low' : 'Low',
          formattedKey === 'manage' ? 'High' : formattedKey === 'keep-informed' ? 'High' : 'Low'
        )
      })
    }

    addRecommendation('manage', matrix.highPowerHighInterest)
    addRecommendation('keep_satisfied', matrix.highPowerLowInterest)
    addRecommendation('keep_informed', matrix.lowPowerHighInterest)
    addRecommendation('monitor', matrix.lowPowerLowInterest)

    return recommendations
  }

  inferRole(name, context = '') {
    const searchSpace = `${name} ${context}`.toLowerCase()

    const roleMatch = Object.keys(this.roleMapping).find(role => searchSpace.includes(role.toLowerCase()))
    if (roleMatch) return roleMatch

    const typeMatch = Array.from(this.stakeholderTypes).find(type => searchSpace.includes(type.toLowerCase()))
    if (typeMatch) return typeMatch

    return 'Stakeholder'
  }

  normalizeRole(role = '') {
    return role.trim().toLowerCase()
  }

  getSnippet(context = '', name = '') {
    const index = context.toLowerCase().indexOf(name.trim().toLowerCase())
    if (index === -1) {
      return context.slice(0, 100)
    }

    return context.slice(Math.max(0, index - 40), index + name.length + 60)
  }

  getQuadrant(power, interest) {
    if (power === 'High' && interest === 'High') return 'manage'
    if (power === 'High' && interest === 'Low') return 'keep-satisfied'
    if (power === 'Low' && interest === 'High') return 'keep-informed'
    return 'monitor'
  }

  getQuadrantColor(power, interest) {
    const quadrant = typeof power === 'string' && typeof interest === 'string'
      ? this.getQuadrant(power, interest)
      : power

    const strategy = this.quadrantStrategies[quadrant?.replace('-', '_')]
    if (strategy?.color) return strategy.color

    switch (quadrant) {
      case 'manage':
        return '#d4185d'
      case 'keep-satisfied':
        return '#ff6600'
      case 'keep-informed':
        return '#009900'
      default:
        return '#cccccc'
    }
  }

  normalizeName(name = '') {
    return name.toLowerCase().trim().replace(/\s+/g, '-')
  }

  formatName(name = '') {
    return name
      .split(/\s+/)
      .map(part => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
      .join(' ')
  }

  getStakeholderProfiles() {
    return Array.from(this.stakeholders.values())
  }
}

export default new StakeholderService()
