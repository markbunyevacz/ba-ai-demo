/**
 * ComplianceTool - LangGraph tool wrapper a complianceService számára
 * 
 * Felelősség:
 * - ComplianceService metódusok LangGraph tool interfészként való expozálása
 * - PMI/BABOK compliance ellenőrzés agent workflow-kban
 */

class ComplianceTool {
  constructor(complianceService) {
    if (!complianceService) {
      throw new Error('ComplianceService is required for ComplianceTool')
    }
    
    this.complianceService = complianceService
    console.log('[ComplianceTool] Initialized')
  }

  /**
   * Ticket compliance értékelés
   * @param {Object} params - {ticket, options}
   * @returns {Object} Compliance eredmény
   */
  async evaluateTicket(params) {
    const { ticket, options = {} } = params
    
    try {
      const evaluation = this.complianceService.evaluateTicket(ticket, options)
      
      return {
        success: true,
        ...evaluation
      }
    } catch (error) {
      return {
        success: false,
        error: error.message
      }
    }
  }

  /**
   * Batch ticket compliance értékelés
   * @param {Object} params - {tickets, options}
   * @returns {Object} Batch compliance eredmény
   */
  async evaluateTickets(params) {
    const { tickets, options = {} } = params
    
    try {
      const evaluation = this.complianceService.evaluateTickets(tickets, options)
      
      return {
        success: true,
        ...evaluation
      }
    } catch (error) {
      return {
        success: false,
        error: error.message
      }
    }
  }

  /**
   * Elérhető compliance szabványok lekérdezése
   * @returns {Object} Szabványok listája
   */
  async getAvailableStandards() {
    try {
      const standards = this.complianceService.getAvailableStandards()
      
      return {
        success: true,
        standards
      }
    } catch (error) {
      return {
        success: false,
        error: error.message,
        standards: []
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
        name: 'evaluate_ticket_compliance',
        description: 'Evaluates a ticket against PMI/BABOK compliance standards',
        parameters: {
          type: 'object',
          properties: {
            ticket: { type: 'object', description: 'The ticket to evaluate' },
            options: { type: 'object', description: 'Evaluation options (e.g., standards to check)' }
          },
          required: ['ticket']
        },
        handler: this.evaluateTicket.bind(this)
      },
      {
        name: 'evaluate_tickets_compliance',
        description: 'Evaluates multiple tickets against compliance standards',
        parameters: {
          type: 'object',
          properties: {
            tickets: { type: 'array', description: 'Array of tickets to evaluate' },
            options: { type: 'object', description: 'Evaluation options' }
          },
          required: ['tickets']
        },
        handler: this.evaluateTickets.bind(this)
      },
      {
        name: 'get_compliance_standards',
        description: 'Gets list of available compliance standards',
        parameters: {
          type: 'object',
          properties: {}
        },
        handler: this.getAvailableStandards.bind(this)
      }
    ]
  }
}

export default ComplianceTool

