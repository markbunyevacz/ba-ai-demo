/**
 * StrategicAgent - PESTLE/SWOT elemzés AI-vel
 * 
 * Felelősség:
 * - PESTLE/SWOT elemzés keyword-based baseline + AI context refinement
 * - Cross-factor kapcsolatok azonosítása
 * - Recommendation prioritization
 */

import BaseAgent from './BaseAgent.js'

class StrategicAgent extends BaseAgent {
  constructor(options = {}) {
    super(options)
    
    this.strategicAnalysisService = options.strategicAnalysisService
    
    if (!this.strategicAnalysisService) {
      throw new Error('StrategicAnalysisService is required for StrategicAgent')
    }
    
    console.log('[StrategicAgent] Initialized')
  }

  /**
   * Ticket stratégiai elemzése hibrid módon (rule-based + AI)
   * @param {Object} ticket - Ticket objektum
   * @returns {Promise<Object>} Enriched strategic analysis
   */
  async analyzeTicket(ticket) {
    console.log('[StrategicAgent] Analyzing ticket:', ticket.id)
    
    // 1. Baseline: szabály-alapú keyword matching
    const baselineAnalysis = this.strategicAnalysisService.analyzeTicket(ticket)
    console.log('[StrategicAgent] Baseline analysis complete')
    
    // 2. AI context refinement
    try {
      const refinedAnalysis = await this.refineAnalysis(ticket, baselineAnalysis)
      
      // 3. Combine baseline + AI
      return {
        ...ticket,
        _strategic: {
          baseline: baselineAnalysis._strategic,
          aiEnhanced: refinedAnalysis,
          confidence: refinedAnalysis.confidence || 0.7,
          timestamp: new Date().toISOString()
        }
      }
      
    } catch (error) {
      console.error('[StrategicAgent] Refinement error:', error.message)
      return baselineAnalysis
    }
  }

  /**
   * Strategic elemzés AI-alapú finomítása
   * @param {Object} ticket - Ticket objektum
   * @param {Object} baselineAnalysis - Baseline elemzés
   * @returns {Promise<Object>} Finomított elemzés
   */
  async refineAnalysis(ticket, baselineAnalysis) {
    const baseline = baselineAnalysis._strategic
    
    const systemPrompt = `Te egy üzleti elemző asszisztens vagy. Finomítsd a stratégiai elemzést (PESTLE/SWOT).

## Ticket:
Summary: ${ticket.summary}
Description: ${ticket.description || ''}
Priority: ${ticket.priority}

## Baseline PESTLE elemzés (keyword-based):
${JSON.stringify(baseline.pestle, null, 2)}

## Baseline SWOT elemzés (keyword-based):
${JSON.stringify(baseline.swot, null, 2)}

## Feladatod:
1. Finomítsd a PESTLE factor besorolást kontextus alapján
2. Azonosítsd a factorok közötti kapcsolatokat
3. Adj hozzá hiányzó stratégiai szempontokat
4. Priorizáld az ajánlásokat business impact alapján
5. NE találj ki adatokat - csak a ticket tartalomra támaszkodj

## Válasz formátum (JSON):
{
  "pestle": {
    "political": {"risks": [], "opportunities": [], "confidence": 0.8},
    "economic": {"risks": [], "opportunities": [], "confidence": 0.8},
    "social": {"risks": [], "opportunities": [], "confidence": 0.7},
    "technological": {"risks": [], "opportunities": [], "confidence": 0.9},
    "legal": {"risks": [], "opportunities": [], "confidence": 0.6},
    "environmental": {"risks": [], "opportunities": [], "confidence": 0.5}
  },
  "swot": {
    "strengths": [{"signal": "...", "confidence": 0.8}],
    "weaknesses": [{"signal": "...", "confidence": 0.7}],
    "opportunities": [{"signal": "...", "confidence": 0.9}],
    "threats": [{"signal": "...", "confidence": 0.8}]
  },
  "recommendations": [
    {"action": "...", "priority": "High|Medium|Low", "impact": "description"}
  ],
  "crossFactorConnections": [
    {"from": "technological", "to": "economic", "description": "..."}
  ],
  "confidence": 0.75
}`

    try {
      const response = await this.executeTask({
        task: 'refine_strategic_analysis',
        ticket,
        baselineAnalysis: baseline
      }, {
        systemPrompt
      })
      
      if (!response.success && response.shouldFallback) {
        return baseline
      }
      
      const parsed = this.parseJSONResponse(response.content)
      
      if (!parsed) {
        console.warn('[StrategicAgent] Failed to parse AI response')
        return baseline
      }
      
      console.log('[StrategicAgent] Refinement complete, confidence:', parsed.confidence || 'unknown')
      
      return parsed
      
    } catch (error) {
      console.error('[StrategicAgent] Refinement error:', error.message)
      return baseline
    }
  }

  /**
   * Batch strategic elemzés
   * @param {Array} tickets - Ticket lista
   * @returns {Promise<Array>} Analyzed tickets
   */
  async analyzeTicketsBatch(tickets) {
    console.log(`[StrategicAgent] Analyzing ${tickets.length} tickets in batch`)
    
    const results = []
    
    for (const ticket of tickets) {
      try {
        const analyzed = await this.analyzeTicket(ticket)
        results.push(analyzed)
      } catch (error) {
        console.error(`[StrategicAgent] Error analyzing ticket ${ticket.id}:`, error.message)
        // Fallback: baseline only
        const baseline = this.strategicAnalysisService.analyzeTicket(ticket)
        results.push({ ...baseline, _error: error.message })
      }
    }
    
    return results
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
        console.error('[StrategicAgent] JSON parsing failed')
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

export default StrategicAgent

