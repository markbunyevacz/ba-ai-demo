/**
 * TicketAgent - Ticket feldolgozás és validáció
 * 
 * Felelősség:
 * - Ticket mezők AI-alapú javítása és kiegészítése
 * - Integráció a groundingService szabály-alapú validációjával
 * - Confidence-based routing (magas confidence: skip AI, közepes: refine, alacsony: regenerate)
 * - Hallucináció detektálás és fallback kezelés
 */

import BaseAgent from './BaseAgent.js'

class TicketAgent extends BaseAgent {
  constructor(options = {}) {
    super(options)
    
    this.groundingService = options.groundingService
    this.complianceService = options.complianceService
    
    if (!this.groundingService) {
      throw new Error('GroundingService is required for TicketAgent')
    }
    
    console.log('[TicketAgent] Initialized with groundingService integration')
  }

  /**
   * Ticket feldolgozás confidence-based routing-gal
   * @param {Object} ticketData - Nyers ticket adatok
   * @param {Object} sourceData - Forrás adatok (Excel sor)
   * @returns {Promise<Object>} Feldolgozott és validált ticket
   */
  async processTicket(ticketData, sourceData) {
    console.log('[TicketAgent] Processing ticket:', ticketData.id || ticketData.summary?.substring(0, 50) || 'unknown')
    
    // 1. Előzetes validáció szabály-alapú logikával
    const preValidation = this.groundingService.validateTicket(ticketData, sourceData)
    console.log('[TicketAgent] Pre-validation confidence:', preValidation.confidence)
    
    // 2. GYORS ÚTVONAL: Ha a confidence magas (>= 0.8), nem használunk AI-t
    if (preValidation.confidence >= 0.8) {
      console.log('[TicketAgent] High confidence (>= 0.8), skipping AI enhancement')
      return this.groundingService.enhanceWithGrounding(ticketData, sourceData)
    }
    
    // 3. KÖZEPES CONFIDENCE (0.5 - 0.8): AI finomítás
    if (preValidation.confidence >= 0.5) {
      console.log('[TicketAgent] Medium confidence (0.5-0.8), requesting AI refinement')
      
      const refinedTicket = await this.refineTicket(ticketData, sourceData, preValidation)
      
      if (refinedTicket.success) {
        // 4. Utólagos validáció
        const postValidation = this.groundingService.validateTicket(refinedTicket.data, sourceData)
        console.log('[TicketAgent] Post-validation confidence:', postValidation.confidence)
        
        if (postValidation.confidence >= 0.7) {
          // 5. Hallucináció ellenőrzés
          const hallucinationCheck = this.groundingService.detectHallucination(refinedTicket.data, sourceData)
          
          if (!hallucinationCheck.detected) {
            console.log('[TicketAgent] AI refinement successful, no hallucinations detected')
            return this.groundingService.enhanceWithGrounding(refinedTicket.data, sourceData)
          } else {
            console.warn('[TicketAgent] Hallucination detected:', hallucinationCheck.reason)
          }
        } else {
          console.warn('[TicketAgent] Post-validation confidence too low:', postValidation.confidence)
        }
      }
    }
    
    // 6. ALACSONY CONFIDENCE (< 0.5): Teljes újragenerálás kísérlet
    if (preValidation.confidence < 0.5) {
      console.log('[TicketAgent] Low confidence (< 0.5), attempting full regeneration')
      
      const regeneratedTicket = await this.regenerateTicket(ticketData, sourceData, preValidation)
      
      if (regeneratedTicket.success) {
        const postValidation = this.groundingService.validateTicket(regeneratedTicket.data, sourceData)
        
        if (postValidation.confidence >= 0.7) {
          const hallucinationCheck = this.groundingService.detectHallucination(regeneratedTicket.data, sourceData)
          
          if (!hallucinationCheck.detected) {
            console.log('[TicketAgent] Regeneration successful')
            return this.groundingService.enhanceWithGrounding(regeneratedTicket.data, sourceData)
          }
        }
      }
    }
    
    // 7. FALLBACK: Szabály-alapú eredmény
    console.warn('[TicketAgent] Falling back to rule-based result')
    return this.groundingService.enhanceWithGrounding(ticketData, sourceData)
  }

  /**
   * Ticket finomítás (közepes confidence esetén)
   * @param {Object} ticketData - Ticket adatok
   * @param {Object} sourceData - Forrás adatok
   * @param {Object} validation - Validációs eredmény
   * @returns {Promise<Object>} Finomított ticket
   */
  async refineTicket(ticketData, sourceData, validation) {
    const systemPrompt = `Te egy üzleti elemző asszisztens vagy. Javítsd ki a következő Jira ticket hibáit és hiányosságait.

## Jelenlegi hibák:
${validation.issues.map(issue => `- ${issue}`).join('\n') || '- Nincs kritikus hiba'}

## Figyelmeztetések:
${validation.warnings.map(warning => `- ${warning}`).join('\n') || '- Nincs figyelmeztetés'}

## Feladatod:
1. Javítsd ki az összes azonosított hibát
2. Töltsd ki a hiányzó mezőket, ha lehetséges a kontextusból
3. Tartsd meg a meglévő helyes adatokat
4. NE találj ki adatokat - csak a forrásadatokra támaszkodj

## Válasz formátum:
Válaszolj JSON formátumban, CSAK a javítandó mezőkkel. Példa:
{
  "summary": "Javított összefoglaló",
  "priority": "High",
  "acceptanceCriteria": ["AC1", "AC2"]
}

## Forrás User Story:
${sourceData.userStory || ticketData.summary || ''}

## Jelenlegi ticket adatok:
${JSON.stringify(ticketData, null, 2)}`

    try {
      const response = await this.executeTask({
        task: 'refine_ticket',
        ticket: ticketData,
        sourceData: sourceData,
        issues: validation.issues,
        warnings: validation.warnings
      }, {
        systemPrompt
      })
      
      if (!response.success && response.shouldFallback) {
        return response
      }
      
      // JSON parsing kísérlet
      const parsedUpdates = this.parseJSONResponse(response.content)
      
      if (!parsedUpdates) {
        console.warn('[TicketAgent] Failed to parse AI response as JSON')
        return { success: false, error: 'Invalid JSON response' }
      }
      
      // Frissített ticket összeállítása
      const refinedTicket = {
        ...ticketData,
        ...parsedUpdates
      }
      
      return {
        success: true,
        data: refinedTicket
      }
      
    } catch (error) {
      console.error('[TicketAgent] Refinement error:', error.message)
      return this.handleError(error)
    }
  }

  /**
   * Ticket újragenerálás (alacsony confidence esetén)
   * @param {Object} ticketData - Ticket adatok
   * @param {Object} sourceData - Forrás adatok
   * @param {Object} validation - Validációs eredmény
   * @returns {Promise<Object>} Újragenerált ticket
   */
  async regenerateTicket(ticketData, sourceData, validation) {
    const systemPrompt = `Te egy üzleti elemző asszisztens vagy. Generálj egy teljes Jira ticket-et a következő user story alapján.

## User Story:
${sourceData.userStory || ticketData.summary || ''}

## További információk:
${sourceData.additionalInfo ? JSON.stringify(sourceData.additionalInfo, null, 2) : 'Nincs további információ'}

## Generálandó mezők:
- summary: Rövid, tömör összefoglaló (max 150 karakter)
- description: Részletes leírás a user story kibontásával
- priority: High, Medium vagy Low
- assignee: Ha van megadva, különben "Unassigned"
- epic: Ha van megadva, különben "No Epic"
- acceptanceCriteria: Lista formátumban, konkrét tesztelési kritériumokkal

## FONTOS:
- NE találj ki neveket, dátumokat vagy technikai részleteket
- HA nincs adat, használj "Unassigned" vagy "TBD" értékeket
- A priority-t a user story alapján becsüld

## Válasz formátum (JSON):
{
  "summary": "...",
  "description": "...",
  "priority": "Medium",
  "assignee": "Unassigned",
  "epic": "No Epic",
  "acceptanceCriteria": ["AC1", "AC2", "AC3"]
}

## Jelenlegi (invalid) ticket a referenciaként:
${JSON.stringify(ticketData, null, 2)}`

    try {
      const response = await this.executeTask({
        task: 'regenerate_ticket',
        sourceData: sourceData,
        originalTicket: ticketData
      }, {
        systemPrompt
      })
      
      if (!response.success && response.shouldFallback) {
        return response
      }
      
      const parsedTicket = this.parseJSONResponse(response.content)
      
      if (!parsedTicket) {
        console.warn('[TicketAgent] Failed to parse regenerated ticket as JSON')
        return { success: false, error: 'Invalid JSON response' }
      }
      
      // ID és timestamp megőrzése az eredeti ticket-ből
      const regeneratedTicket = {
        id: ticketData.id,
        createdAt: ticketData.createdAt || new Date().toISOString(),
        ...parsedTicket
      }
      
      return {
        success: true,
        data: regeneratedTicket
      }
      
    } catch (error) {
      console.error('[TicketAgent] Regeneration error:', error.message)
      return this.handleError(error)
    }
  }

  /**
   * JSON válasz parsing fallback-kel
   * @param {string} content - AI válasz szöveg
   * @returns {Object|null} Parsed JSON vagy null
   */
  parseJSONResponse(content) {
    try {
      // Tiszta JSON próbálkozás
      return JSON.parse(content)
    } catch (firstError) {
      try {
        // Markdown code block eltávolítása
        const jsonMatch = content.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/)
        if (jsonMatch) {
          return JSON.parse(jsonMatch[1])
        }
        
        // Szöveg előtti/utáni whitespace eltávolítása
        const trimmed = content.trim()
        if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
          return JSON.parse(trimmed)
        }
        
        console.error('[TicketAgent] JSON parsing failed, content:', content.substring(0, 200))
        return null
        
      } catch (secondError) {
        console.error('[TicketAgent] All JSON parsing attempts failed')
        return null
      }
    }
  }

  /**
   * Üzenetek összeállítása (BaseAgent felülírása)
   * @param {Object} taskDefinition - Feladat definíció
   * @param {Object} context - Kontextus
   * @returns {Array} Anthropic üzenetek
   */
  buildMessages(taskDefinition, context) {
    const messages = []
    
    if (context.systemPrompt) {
      messages.push({
        role: 'user',
        content: context.systemPrompt
      })
    } else {
      // Fallback: egyszerű JSON formázás
      messages.push({
        role: 'user',
        content: `Task: ${taskDefinition.task}\n\nData:\n${JSON.stringify(taskDefinition, null, 2)}`
      })
    }
    
    return messages
  }

  /**
   * Batch ticket feldolgozás
   * @param {Array} tickets - Ticket lista
   * @param {Array} sourceDataList - Forrás adatok lista
   * @returns {Promise<Array>} Feldolgozott ticket-ek
   */
  async processTicketsBatch(tickets, sourceDataList) {
    console.log(`[TicketAgent] Processing ${tickets.length} tickets in batch`)
    
    const results = []
    
    for (let i = 0; i < tickets.length; i++) {
      const ticket = tickets[i]
      const sourceData = sourceDataList[i] || {}
      
      try {
        const processed = await this.processTicket(ticket, sourceData)
        results.push(processed)
      } catch (error) {
        console.error(`[TicketAgent] Error processing ticket ${i}:`, error.message)
        // Fallback: add original with error flag
        results.push({
          ...ticket,
          _error: error.message,
          _fallback: true
        })
      }
    }
    
    console.log(`[TicketAgent] Batch processing complete. Success: ${results.filter(r => !r._fallback).length}/${tickets.length}`)
    
    return results
  }
}

export default TicketAgent

