/**
 * StakeholderAgent - Stakeholder elemzés AI-vel
 * 
 * Felelősség:
 * - Stakeholder azonosítás szabály-alapú baseline + AI enrichment
 * - Power/Interest mátrix pozíció finomítása kontextus alapján
 * - Role assignment javítása
 */

import BaseAgent from './BaseAgent.js'

class StakeholderAgent extends BaseAgent {
  constructor(options = {}) {
    super(options)
    
    this.stakeholderService = options.stakeholderService
    this.groundingService = options.groundingService
    
    if (!this.stakeholderService) {
      throw new Error('StakeholderService is required for StakeholderAgent')
    }
    
    console.log('[StakeholderAgent] Initialized')
  }

  /**
   * Stakeholder elemzés hibrid módon (rule-based + AI)
   * @param {Array} tickets - Ticket lista
   * @returns {Promise<Array>} Enriched stakeholder lista
   */
  async analyzeStakeholders(tickets) {
    console.log('[StakeholderAgent] Analyzing stakeholders from', tickets.length, 'tickets')
    
    // 1. Baseline: szabály-alapú azonosítás
    const baselineStakeholders = this.stakeholderService.identifyStakeholders(tickets)
    console.log('[StakeholderAgent] Baseline identified:', baselineStakeholders.length, 'stakeholders')
    
    if (baselineStakeholders.length === 0) {
      console.warn('[StakeholderAgent] No stakeholders found in baseline')
      return []
    }
    
    // 2. AI enrichment
    try {
      const enrichedStakeholders = await this.enrichStakeholders(baselineStakeholders, tickets)
      
      // 3. Validate results
      if (this.groundingService) {
        const validation = this.groundingService.validateStakeholders(enrichedStakeholders)
        
        if (!validation.valid) {
          console.warn('[StakeholderAgent] Validation failed, using baseline')
          return baselineStakeholders
        }
        
        // Remove hallucinated stakeholders
        const cleanedStakeholders = enrichedStakeholders.filter(sh => {
          const isHallucinated = validation.hallucinations.some(h => h.name === sh.name)
          if (isHallucinated) {
            console.warn('[StakeholderAgent] Removing hallucinated stakeholder:', sh.name)
          }
          return !isHallucinated
        })
        
        return cleanedStakeholders
      }
      
      return enrichedStakeholders
      
    } catch (error) {
      console.error('[StakeholderAgent] Enrichment error:', error.message)
      return baselineStakeholders
    }
  }

  /**
   * Stakeholder lista AI-alapú finomítása
   * @param {Array} stakeholders - Baseline stakeholder lista
   * @param {Array} tickets - Ticket lista kontextusnak
   * @returns {Promise<Array>} Finomított stakeholder lista
   */
  async enrichStakeholders(stakeholders, tickets) {
    const systemPrompt = `Te egy üzleti elemző asszisztens vagy. Finomítsd a stakeholder elemzést.

## Feladatod:
1. Elemezd a stakeholderek power/interest szintjeit a kontextus alapján
2. Azonosíts implicit stakeholdereket (akik nem említettek explicit, de szerepük van)
3. Javítsd a role assignment-eket
4. NE találj ki új stakeholdereket pontos forrás nélkül

## Baseline stakeholderek:
${JSON.stringify(stakeholders.map(sh => ({
  name: sh.name,
  power: sh.power,
  interest: sh.interest,
  roles: sh.roles,
  frequency: sh.frequency
})), null, 2)}

## Ticket kontextus:
${tickets.slice(0, 10).map(t => `- ${t.summary}`).join('\n')}

## Válasz formátum (JSON):
{
  "stakeholders": [
    {
      "name": "Stakeholder Name",
      "power": "High|Medium|Low",
      "interest": "High|Medium|Low",
      "roles": ["Role1", "Role2"],
      "reasoning": "Brief explanation for power/interest levels"
    }
  ],
  "implicitStakeholders": [
    {
      "name": "New Stakeholder",
      "power": "Medium",
      "interest": "High",
      "roles": ["Role"],
      "source": "Inferred from ticket X"
    }
  ]
}`

    try {
      const response = await this.executeTask({
        task: 'enrich_stakeholders',
        stakeholders,
        tickets: tickets.slice(0, 10)
      }, {
        systemPrompt
      })
      
      if (!response.success && response.shouldFallback) {
        return stakeholders
      }
      
      const parsed = this.parseJSONResponse(response.content)
      
      if (!parsed || !parsed.stakeholders) {
        console.warn('[StakeholderAgent] Failed to parse AI response')
        return stakeholders
      }
      
      // Merge baseline + AI eredmények
      const mergedStakeholders = this.mergeStakeholderResults(stakeholders, parsed)
      
      console.log('[StakeholderAgent] Enrichment complete:', mergedStakeholders.length, 'stakeholders')
      
      return mergedStakeholders
      
    } catch (error) {
      console.error('[StakeholderAgent] Enrichment error:', error.message)
      return stakeholders
    }
  }

  /**
   * Baseline és AI eredmények merge-elése
   * @param {Array} baseline - Szabály-alapú lista
   * @param {Object} aiResults - AI válasz {stakeholders, implicitStakeholders}
   * @returns {Array} Merged lista
   */
  mergeStakeholderResults(baseline, aiResults) {
    const merged = new Map()
    
    // 1. Baseline stakeholderek hozzáadása
    baseline.forEach(sh => {
      merged.set(sh.name.toLowerCase(), { ...sh })
    })
    
    // 2. AI finomítások alkalmazása
    if (aiResults.stakeholders) {
      aiResults.stakeholders.forEach(aiSh => {
        const key = aiSh.name.toLowerCase()
        
        if (merged.has(key)) {
          // Frissítés: AI finomítások alkalmazása
          const existing = merged.get(key)
          merged.set(key, {
            ...existing,
            power: aiSh.power || existing.power,
            interest: aiSh.interest || existing.interest,
            roles: aiSh.roles || existing.roles,
            _aiReasoning: aiSh.reasoning
          })
        }
      })
    }
    
    // 3. Implicit stakeholderek hozzáadása (csak ha van forrás)
    if (aiResults.implicitStakeholders) {
      aiResults.implicitStakeholders.forEach(implicitSh => {
        const key = implicitSh.name.toLowerCase()
        
        if (!merged.has(key) && implicitSh.source) {
          merged.set(key, {
            name: implicitSh.name,
            power: implicitSh.power || 'Medium',
            interest: implicitSh.interest || 'Medium',
            roles: implicitSh.roles || ['Stakeholder'],
            frequency: 0,
            mentions: [],
            assignments: [],
            _implicit: true,
            _source: implicitSh.source
          })
        }
      })
    }
    
    return Array.from(merged.values())
  }

  /**
   * JSON válasz parsing
   * @param {string} content - AI válasz szöveg
   * @returns {Object|null} Parsed JSON
   */
  parseJSONResponse(content) {
    try {
      return JSON.parse(content)
    } catch (firstError) {
      try {
        const jsonMatch = content.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/)
        if (jsonMatch) {
          return JSON.parse(jsonMatch[1])
        }
        
        const trimmed = content.trim()
        if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
          return JSON.parse(trimmed)
        }
        
        return null
      } catch (secondError) {
        console.error('[StakeholderAgent] JSON parsing failed')
        return null
      }
    }
  }

  /**
   * Üzenetek összeállítása
   * @param {Object} taskDefinition - Feladat definíció
   * @param {Object} context - Kontextus
   * @returns {Array} Anthropic üzenetek
   */
  buildMessages(taskDefinition, context) {
    if (context.systemPrompt) {
      return [
        {
          role: 'user',
          content: context.systemPrompt
        }
      ]
    }
    
    return super.buildMessages(taskDefinition, context)
  }
}

export default StakeholderAgent

