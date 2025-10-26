/**
 * Stakeholder Identification & Analysis Service
 * Performs NLP-based extraction, categorization, and power/interest analysis
 */

class StakeholderService {
  constructor() {
    this.stakeholders = new Map()
    
    // Stakeholder type definitions
    this.STAKEHOLDER_TYPES = {
      'Product Owner': { power: 'High', interest: 'High', color: '#d4185d' },
      'Business Analyst': { power: 'High', interest: 'High', color: '#d4185d' },
      'Project Manager': { power: 'High', interest: 'High', color: '#d4185d' },
      'Developer': { power: 'Medium', interest: 'High', color: '#0066cc' },
      'QA Engineer': { power: 'Medium', interest: 'High', color: '#0066cc' },
      'Tester': { power: 'Medium', interest: 'High', color: '#0066cc' },
      'End User': { power: 'Low', interest: 'High', color: '#009900' },
      'Customer': { power: 'Medium', interest: 'High', color: '#0066cc' },
      'Stakeholder': { power: 'Medium', interest: 'Medium', color: '#ff9900' },
      'Manager': { power: 'High', interest: 'Medium', color: '#ff6600' },
      'Executive': { power: 'High', interest: 'Medium', color: '#ff6600' },
      'Sponsor': { power: 'High', interest: 'High', color: '#d4185d' }
    }

    // Extraction patterns
    this.EXTRACTION_PATTERNS = [
      /assigned to[:\s]+([A-Za-z\s]+?)(?:[,.]|$)/gi,
      /assignee[:\s]+([A-Za-z\s]+?)(?:[,.]|$)/gi,
      /stakeholder[s]?[:\s]+([A-Za-z\s,&]+?)(?:[,.]|$)/gi,
      /contact[:\s]+([A-Za-z\s]+?)(?:[,.]|$)/gi,
      /mentioned by[:\s]+([A-Za-z\s]+?)(?:[,.]|$)/gi,
      /owner[:\s]+([A-Za-z\s]+?)(?:[,.]|$)/gi,
      /lead[:\s]+([A-Za-z\s]+?)(?:[,.]|$)/gi,
      /manager[:\s]+([A-Za-z\s]+?)(?:[,.]|$)/gi,
      /reporter[:\s]+([A-Za-z\s]+?)(?:[,.]|$)/gi,
      /involving[:\s]+([A-Za-z\s,&]+?)(?:[,.]|$)/gi,
      /team[:\s]+([A-Za-z\s,&]+?)(?:[,.]|$)/gi,
      /department[:\s]+([A-Za-z\s,&]+?)(?:[,.]|$)/gi
    ]

    // Interest keywords
    this.INTEREST_KEYWORDS = {
      high: ['critical', 'important', 'urgent', 'required', 'must', 'essential', 'dependent', 'directly', 'directly involved'],
      medium: ['involved', 'contribute', 'support', 'helps', 'related', 'relevant'],
      low: ['inform', 'notify', 'aware', 'optional', 'nice to have', 'future']
    }

    // Power keywords
    this.POWER_KEYWORDS = {
      high: ['decides', 'approves', 'authorizes', 'budget', 'executive', 'sponsor', 'owner', 'lead', 'manager'],
      medium: ['implements', 'develops', 'designs', 'reviews', 'team lead', 'senior'],
      low: ['executes', 'supports', 'assists', 'junior', 'intern']
    }
  }

  /**
   * Identify stakeholders from tickets
   */
  identifyStakeholders(tickets) {
    const stakeholders = new Map()

    tickets.forEach((ticket, index) => {
      const text = `${ticket.summary || ''} ${ticket.description || ''} ${ticket.assignee || ''}`
      
      // Extract stakeholder mentions
      this.EXTRACTION_PATTERNS.forEach(pattern => {
        let match
        while ((match = pattern.exec(text)) !== null) {
          if (match[1]) {
            const names = match[1]
              .split(/[,&\s]+/)
              .map(n => n.trim())
              .filter(n => n.length > 2 && n.length < 50)

            names.forEach(name => {
              if (name && name.length > 2) {
                const normalized = this.normalizeName(name)
                
                if (!stakeholders.has(normalized)) {
                  stakeholders.set(normalized, {
                    name: this.formatName(name),
                    originalName: name,
                    mentions: [],
                    type: this.inferType(name),
                    power: 'Medium',
                    interest: 'Medium',
                    frequency: 0,
                    confidence: 0
                  })
                }

                const stakeholder = stakeholders.get(normalized)
                stakeholder.mentions.push({
                  ticketId: ticket.id,
                  context: text.substring(Math.max(0, match.index - 50), match.index + 100),
                  source: 'extraction'
                })
                stakeholder.frequency += 1
              }
            })
          }
        }
      })

      // Add assignee if present
      if (ticket.assignee && ticket.assignee !== 'Unassigned') {
        const normalized = this.normalizeName(ticket.assignee)
        
        if (!stakeholders.has(normalized)) {
          stakeholders.set(normalized, {
            name: this.formatName(ticket.assignee),
            originalName: ticket.assignee,
            mentions: [],
            type: 'Developer',
            power: 'Medium',
            interest: 'High',
            frequency: 0,
            confidence: 0.95
          })
        }

        const stakeholder = stakeholders.get(normalized)
        stakeholder.mentions.push({
          ticketId: ticket.id,
          context: 'Assigned to this ticket',
          source: 'assignee'
        })
        stakeholder.frequency += 1
      }
    })

    // Categorize each stakeholder
    stakeholders.forEach((stakeholder, key) => {
      this.categorizeStakeholder(stakeholder)
      // Calculate confidence based on mentions and patterns
      stakeholder.confidence = Math.min(0.95, 0.5 + (stakeholder.frequency * 0.1))
    })

    this.stakeholders = stakeholders
    return Array.from(stakeholders.values())
  }

  /**
   * Categorize stakeholder by power and interest levels
   */
  categorizeStakeholder(stakeholder) {
    let power = 'Medium'
    let interest = 'Medium'

    // Determine power level
    if (this.STAKEHOLDER_TYPES[stakeholder.type]) {
      power = this.STAKEHOLDER_TYPES[stakeholder.type].power
    } else {
      const name = (stakeholder.name || '').toLowerCase()
      const text = stakeholder.mentions.map(m => m.context || '').join(' ').toLowerCase()
      
      if (this.POWER_KEYWORDS.high.some(kw => name.includes(kw) || text.includes(kw))) {
        power = 'High'
      } else if (this.POWER_KEYWORDS.low.some(kw => name.includes(kw) || text.includes(kw))) {
        power = 'Low'
      }
    }

    // Determine interest level
    if (this.STAKEHOLDER_TYPES[stakeholder.type]) {
      interest = this.STAKEHOLDER_TYPES[stakeholder.type].interest
    } else {
      const text = stakeholder.mentions.map(m => m.context || '').join(' ').toLowerCase()
      
      if (this.INTEREST_KEYWORDS.high.some(kw => text.includes(kw))) {
        interest = 'High'
      } else if (this.INTEREST_KEYWORDS.low.some(kw => text.includes(kw))) {
        interest = 'Low'
      }
    }

    stakeholder.power = power
    stakeholder.interest = interest
    stakeholder.quadrant = this.getQuadrant(power, interest)
    stakeholder.color = this.getQuadrantColor(power, interest)

    return stakeholder
  }

  /**
   * Generate power/interest matrix data
   */
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
        averageInterest: 0
      }
    }

    // Categorize stakeholders
    data.forEach(stakeholder => {
      const quadrant = stakeholder.quadrant || this.getQuadrant(stakeholder.power, stakeholder.interest)
      
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
        case 'monitor':
          matrix.lowPowerLowInterest.push(stakeholder)
          break
      }

      // Aggregate by type
      if (!matrix.summary.byType[stakeholder.type]) {
        matrix.summary.byType[stakeholder.type] = 0
      }
      matrix.summary.byType[stakeholder.type] += 1
    })

    // Calculate aggregates
    matrix.summary.byQuadrant = {
      manage: matrix.highPowerHighInterest.length,
      keep_satisfied: matrix.highPowerLowInterest.length,
      keep_informed: matrix.lowPowerHighInterest.length,
      monitor: matrix.lowPowerLowInterest.length
    }

    return matrix
  }

  /**
   * Analyze stakeholder influence network
   */
  analyzeInfluenceNetwork(stakeholders = null) {
    const data = stakeholders || Array.from(this.stakeholders.values())

    const nodes = data.map(s => ({
      id: this.normalizeName(s.name),
      label: s.name,
      type: s.type,
      power: s.power,
      interest: s.interest,
      frequency: s.frequency,
      color: s.color || this.getQuadrantColor(s.power, s.interest),
      size: Math.max(20, Math.min(50, 15 + s.frequency * 5))
    }))

    // Build relationships based on co-mentions
    const edges = []
    const mentioned = new Map()

    data.forEach(stakeholder => {
      stakeholder.mentions.forEach(mention => {
        if (!mentioned.has(mention.ticketId)) {
          mentioned.set(mention.ticketId, [])
        }
        mentioned.get(mention.ticketId).push(this.normalizeName(stakeholder.name))
      })
    })

    // Create edges between co-mentioned stakeholders
    mentioned.forEach((names, ticketId) => {
      for (let i = 0; i < names.length; i++) {
        for (let j = i + 1; j < names.length; j++) {
          const existingEdge = edges.find(e => 
            (e.from === names[i] && e.to === names[j]) || 
            (e.from === names[j] && e.to === names[i])
          )
          
          if (existingEdge) {
            existingEdge.weight += 1
          } else {
            edges.push({
              from: names[i],
              to: names[j],
              weight: 1
            })
          }
        }
      }
    })

    // Sort edges by weight
    edges.sort((a, b) => b.weight - a.weight)

    return {
      nodes,
      edges: edges.slice(0, 50), // Top 50 relationships
      network: {
        nodeCount: nodes.length,
        edgeCount: edges.length,
        density: edges.length / (nodes.length * (nodes.length - 1) / 2),
        topInfluencers: this.getTopInfluencers(data)
      }
    }
  }

  /**
   * Get top influencers by power and frequency
   */
  getTopInfluencers(stakeholders) {
    return stakeholders
      .map(s => ({
        ...s,
        influenceScore: (
          (s.power === 'High' ? 3 : s.power === 'Medium' ? 2 : 1) *
          (s.interest === 'High' ? 3 : s.interest === 'Medium' ? 2 : 1) *
          Math.log(s.frequency + 1)
        )
      }))
      .sort((a, b) => b.influenceScore - a.influenceScore)
      .slice(0, 10)
      .map(({ influenceScore, ...s }) => s)
  }

  /**
   * Get engagement recommendations
   */
  getEngagementRecommendations(matrix) {
    const recommendations = []

    // Manage closely (High Power, High Interest)
    if (matrix.highPowerHighInterest.length > 0) {
      recommendations.push({
        quadrant: 'manage',
        title: 'Manage Closely',
        stakeholders: matrix.highPowerHighInterest,
        strategies: [
          'Involve in key decisions and planning',
          'Regular updates and consultations',
          'Address concerns proactively',
          'Seek active participation'
        ],
        color: '#d4185d'
      })
    }

    // Keep Satisfied (High Power, Low Interest)
    if (matrix.highPowerLowInterest.length > 0) {
      recommendations.push({
        quadrant: 'keep-satisfied',
        title: 'Keep Satisfied',
        stakeholders: matrix.highPowerLowInterest,
        strategies: [
          'Regular updates with key information',
          'Highlight outcomes and benefits',
          'Avoid over-communication',
          'Ensure expectations are clear'
        ],
        color: '#ff6600'
      })
    }

    // Keep Informed (Low Power, High Interest)
    if (matrix.lowPowerHighInterest.length > 0) {
      recommendations.push({
        quadrant: 'keep-informed',
        title: 'Keep Informed',
        stakeholders: matrix.lowPowerHighInterest,
        strategies: [
          'Provide regular updates',
          'Include in relevant discussions',
          'Share progress and milestones',
          'Answer questions promptly'
        ],
        color: '#009900'
      })
    }

    // Monitor (Low Power, Low Interest)
    if (matrix.lowPowerLowInterest.length > 0) {
      recommendations.push({
        quadrant: 'monitor',
        title: 'Monitor',
        stakeholders: matrix.lowPowerLowInterest,
        strategies: [
          'General awareness only',
          'Minimal communication',
          'Watch for changes in interest/power',
          'Provide information if requested'
        ],
        color: '#cccccc'
      })
    }

    return recommendations
  }

  /**
   * Helper: Get quadrant name
   */
  getQuadrant(power, interest) {
    if (power === 'High' && interest === 'High') return 'manage'
    if (power === 'High' && interest === 'Low') return 'keep-satisfied'
    if (power === 'Low' && interest === 'High') return 'keep-informed'
    return 'monitor'
  }

  /**
   * Helper: Get quadrant color
   */
  getQuadrantColor(power, interest) {
    if (power === 'High' && interest === 'High') return '#d4185d' // Red
    if (power === 'High' && interest === 'Low') return '#ff6600' // Orange
    if (power === 'Low' && interest === 'High') return '#009900' // Green
    return '#cccccc' // Gray
  }

  /**
   * Helper: Infer stakeholder type from name
   */
  inferType(name) {
    const lower = name.toLowerCase()
    
    for (const [type, _] of Object.entries(this.STAKEHOLDER_TYPES)) {
      if (lower.includes(type.toLowerCase())) {
        return type
      }
    }
    
    return 'Stakeholder'
  }

  /**
   * Helper: Normalize name for comparison
   */
  normalizeName(name) {
    return name
      .toLowerCase()
      .trim()
      .replace(/\s+/g, '-')
  }

  /**
   * Helper: Format name for display
   */
  formatName(name) {
    return name
      .split(/[\s-]+/)
      .map(part => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
      .join(' ')
  }

  /**
   * Validate stakeholder data
   */
  validateStakeholders(stakeholders) {
    const issues = []

    stakeholders.forEach((s, index) => {
      if (!s.name || s.name.trim().length === 0) {
        issues.push(`Stakeholder ${index}: Missing name`)
      }
      if (!['Low', 'Medium', 'High'].includes(s.power)) {
        issues.push(`Stakeholder ${s.name}: Invalid power level`)
      }
      if (!['Low', 'Medium', 'High'].includes(s.interest)) {
        issues.push(`Stakeholder ${s.name}: Invalid interest level`)
      }
      if (!s.mentions || s.mentions.length === 0) {
        issues.push(`Stakeholder ${s.name}: No mentions found (possible hallucination)`)
      }
    })

    return {
      valid: issues.length === 0,
      issues,
      warnings: this.detectPotentialHallucinations(stakeholders)
    }
  }

  /**
   * Detect hallucinated stakeholders
   */
  detectPotentialHallucinations(stakeholders) {
    const warnings = []

    stakeholders.forEach(s => {
      // Flag stakeholders with very low frequency
      if (s.frequency === 1 && s.confidence < 0.6) {
        warnings.push(`${s.name}: Single mention with low confidence (possible hallucination)`)
      }

      // Flag generic names
      if (s.name.length < 4 || s.name === 'User' || s.name === 'Team') {
        warnings.push(`${s.name}: Generic name (verify in source data)`)
      }

      // Flag malformed data
      if (s.name.includes(',') || s.name.includes('@') || s.name.length > 50) {
        warnings.push(`${s.name}: Suspicious format (verify extraction)`)
      }
    })

    return warnings
  }
}

export default new StakeholderService()
