/**
 * GroundingTool - LangGraph tool wrapper a groundingService számára
 * 
 * Felelősség:
 * - GroundingService metódusok LangGraph tool interfészként való expozálása
 * - Ticket validáció és hallucináció detektálás agent workflow-kban
 */

class GroundingTool {
  constructor(groundingService) {
    if (!groundingService) {
      throw new Error('GroundingService is required for GroundingTool')
    }
    
    this.groundingService = groundingService
    console.log('[GroundingTool] Initialized')
  }

  /**
   * Ticket validálás tool
   * @param {Object} params - {ticket, sourceData}
   * @returns {Object} Validációs eredmény
   */
  async validateTicket(params) {
    const { ticket, sourceData } = params
    
    try {
      const validation = this.groundingService.validateTicket(ticket, sourceData)
      
      return {
        success: true,
        ...validation
      }
    } catch (error) {
      return {
        success: false,
        error: error.message
      }
    }
  }

  /**
   * Hallucináció detektálás tool
   * @param {Object} params - {ticket, sourceData}
   * @returns {Object} Hallucináció eredmény
   */
  async detectHallucination(params) {
    const { ticket, sourceData } = params
    
    try {
      const result = this.groundingService.detectHallucination(ticket, sourceData)
      
      return {
        success: true,
        ...result
      }
    } catch (error) {
      return {
        success: false,
        error: error.message,
        detected: false
      }
    }
  }

  /**
   * Ticket kiegészítése grounding metaadatokkal
   * @param {Object} params - {ticket, sourceData}
   * @returns {Object} Kiegészített ticket
   */
  async enhanceWithGrounding(params) {
    const { ticket, sourceData } = params
    
    try {
      const enhanced = this.groundingService.enhanceWithGrounding(ticket, sourceData)
      
      return {
        success: true,
        ticket: enhanced
      }
    } catch (error) {
      return {
        success: false,
        error: error.message,
        ticket
      }
    }
  }

  /**
   * LangGraph tool definíciók lekérdezése
   * @returns {Array} Tool definíciók
   */
  getToolDefinitions() {
    return [
      {
        name: 'validate_ticket',
        description: 'Validates a ticket against business rules and knowledge base',
        parameters: {
          type: 'object',
          properties: {
            ticket: { type: 'object', description: 'The ticket to validate' },
            sourceData: { type: 'object', description: 'Source data for validation' }
          },
          required: ['ticket', 'sourceData']
        },
        handler: this.validateTicket.bind(this)
      },
      {
        name: 'detect_hallucination',
        description: 'Detects potential hallucinations in AI-generated ticket content',
        parameters: {
          type: 'object',
          properties: {
            ticket: { type: 'object', description: 'The ticket to check' },
            sourceData: { type: 'object', description: 'Original source data' }
          },
          required: ['ticket', 'sourceData']
        },
        handler: this.detectHallucination.bind(this)
      },
      {
        name: 'enhance_with_grounding',
        description: 'Enhances ticket with grounding metadata',
        parameters: {
          type: 'object',
          properties: {
            ticket: { type: 'object', description: 'The ticket to enhance' },
            sourceData: { type: 'object', description: 'Source data reference' }
          },
          required: ['ticket', 'sourceData']
        },
        handler: this.enhanceWithGrounding.bind(this)
      }
    ]
  }
}

export default GroundingTool

