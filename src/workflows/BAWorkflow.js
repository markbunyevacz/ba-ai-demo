/**
 * BAWorkflow - Üzleti elemző workflow LangGraph implementációval
 * 
 * Felelősség:
 * - Excel/Word dokumentumok feldolgozása ticket generáláshoz
 * - Validation, stakeholder és strategic analysis koordinálása
 * - Hibakezelés és fallback logika
 * 
 * Workflow állapotok:
 * intake → ticket_generation → validation → stakeholder → strategic → finalization
 */

import { StateGraph } from '@langchain/langgraph'

class BAWorkflow {
  constructor(options = {}) {
    // Szolgáltatások
    this.ticketAgent = options.ticketAgent
    this.groundingService = options.groundingService
    this.complianceService = options.complianceService
    this.stakeholderService = options.stakeholderService
    this.strategicAnalysisService = options.strategicAnalysisService
    this.monitoringService = options.monitoringService
    
    // Validáció
    if (!this.groundingService) {
      throw new Error('GroundingService is required for BAWorkflow')
    }
    
    // LangGraph workflow építése
    this.graph = this.buildGraph()
    
    console.log('[BAWorkflow] Initialized with', Object.keys(options).length, 'services')
  }

  /**
   * LangGraph workflow graph összeállítása
   * @returns {CompiledGraph} Compiled LangGraph workflow
   */
  buildGraph() {
    console.log('[BAWorkflow] Building workflow graph...')
    
    // State channels definiálása
    const workflow = new StateGraph({
      channels: {
        // Bemeneti adatok
        rows: { value: (x, y) => y ?? x, default: () => [] },
        fileName: { value: (x, y) => y ?? x, default: () => '' },
        sessionId: { value: (x, y) => y ?? x, default: () => 'default' },
        
        // Feldolgozási eredmények
        tickets: { value: (x, y) => y ?? x, default: () => [] },
        validations: { value: (x, y) => y ?? x, default: () => [] },
        stakeholders: { value: (x, y) => y ?? x, default: () => [] },
        strategicData: { value: (x, y) => y ?? x, default: () => ({}) },
        
        // Hibák és metaadatok
        errors: { value: (x, y) => (x || []).concat(y || []), default: () => [] },
        metadata: { value: (x, y) => ({ ...x, ...y }), default: () => ({}) }
      }
    })

    // Node-ok hozzáadása
    workflow.addNode('intake', this.intakeNode.bind(this))
    workflow.addNode('ticket_generation', this.ticketGenerationNode.bind(this))
    workflow.addNode('validation', this.validationNode.bind(this))
    workflow.addNode('stakeholder_identification', this.stakeholderIdentificationNode.bind(this))
    workflow.addNode('strategic_analysis', this.strategicAnalysisNode.bind(this))
    workflow.addNode('finalization', this.finalizationNode.bind(this))

    // Edge-ek (állapotátmenetek)
    workflow.addEdge('intake', 'ticket_generation')
    workflow.addEdge('ticket_generation', 'validation')
    workflow.addEdge('validation', 'stakeholder_identification')
    workflow.addEdge('stakeholder_identification', 'strategic_analysis')
    workflow.addEdge('strategic_analysis', 'finalization')

    // Entry és finish pontok
    workflow.setEntryPoint('intake')
    workflow.setFinishPoint('finalization')

    console.log('[BAWorkflow] Graph built with 6 nodes')
    return workflow.compile()
  }

  /**
   * Workflow végrehajtása
   * @param {Object} inputData - Bemeneti adatok (rows, fileName, sessionId)
   * @returns {Promise<Object>} Feldolgozott eredmények
   */
  async execute(inputData) {
    console.log('[BAWorkflow] Starting execution for session:', inputData.sessionId || 'unknown')
    
    const startTime = Date.now()
    
    try {
      // Initial state
      const initialState = {
        rows: inputData.rows || [],
        fileName: inputData.fileName || 'unknown',
        sessionId: inputData.sessionId || 'default',
        tickets: [],
        validations: [],
        stakeholders: [],
        strategicData: {},
        errors: [],
        metadata: {
          startTime: new Date().toISOString(),
          workflowVersion: '1.0.0'
        }
      }
      
      // Graph végrehajtás
      const finalState = await this.graph.invoke(initialState)
      
      const duration = Date.now() - startTime
      console.log(`[BAWorkflow] Execution completed in ${duration}ms`)
      
      // Monitoring log
      if (this.monitoringService) {
        this.monitoringService.trackCompletion(inputData.sessionId, {
          success: true,
          ticketsGenerated: finalState.tickets.length,
          stakeholdersIdentified: finalState.stakeholders.length,
          duration,
          agentUsed: true
        })
      }
      
      return finalState
      
    } catch (workflowError) {
      console.error('[BAWorkflow] Execution failed:', workflowError.message)
      
      // Monitoring log
      if (this.monitoringService) {
        this.monitoringService.trackCompletion(inputData.sessionId, {
          success: false,
          error: workflowError.message,
          agentUsed: true
        })
      }
      
      // Hiba típus alapján döntés
      if (workflowError.message.includes('API') || workflowError.message.includes('timeout')) {
        throw new Error('Agent API unavailable - fallback recommended')
      }
      
      throw workflowError
    }
  }

  /**
   * Intake node - Bemeneti adatok fogadása és előkészítése
   */
  async intakeNode(state) {
    console.log('[BAWorkflow:intake] Processing', state.rows.length, 'rows')
    
    try {
      // Validáljuk, hogy van-e adat
      if (!state.rows || state.rows.length === 0) {
        return {
          ...state,
          errors: state.errors.concat({ node: 'intake', message: 'No input data provided' })
        }
      }
      
      // Metaadatok frissítése
      return {
        ...state,
        metadata: {
          ...state.metadata,
          inputRows: state.rows.length,
          intakeComplete: true
        }
      }
    } catch (error) {
      console.error('[BAWorkflow:intake] Error:', error.message)
      return {
        ...state,
        errors: state.errors.concat({ node: 'intake', message: error.message })
      }
    }
  }

  /**
   * Ticket Generation node - Ticket-ek generálása TicketAgent-tel vagy szabály-alapúan
   */
  async ticketGenerationNode(state) {
    console.log('[BAWorkflow:ticket_generation] Generating tickets from', state.rows.length, 'rows')
    
    try {
      const tickets = []
      
      // Ha van TicketAgent, használjuk
      if (this.ticketAgent) {
        console.log('[BAWorkflow:ticket_generation] Using TicketAgent for AI-powered generation')
        
        for (let i = 0; i < state.rows.length; i++) {
          const row = state.rows[i]
          
          // Ticket objektum összeállítása a sorból
          const ticketData = this.rowToTicket(row, i)
          const sourceData = { rowIndex: i, userStory: row[0] || '' }
          
          try {
            const processedTicket = await this.ticketAgent.processTicket(ticketData, sourceData)
            tickets.push(processedTicket)
          } catch (ticketError) {
            console.error(`[BAWorkflow:ticket_generation] Error processing ticket ${i}:`, ticketError.message)
            // Fallback: szabály-alapú ticket
            const fallbackTicket = this.groundingService.enhanceWithGrounding(ticketData, sourceData)
            tickets.push({ ...fallbackTicket, _fallback: true })
          }
        }
      } else {
        // Szabály-alapú generálás
        console.log('[BAWorkflow:ticket_generation] Using rule-based generation')
        
        for (let i = 0; i < state.rows.length; i++) {
          const row = state.rows[i]
          const ticketData = this.rowToTicket(row, i)
          const sourceData = { rowIndex: i, userStory: row[0] || '' }
          
          const ticket = this.groundingService.enhanceWithGrounding(ticketData, sourceData)
          tickets.push(ticket)
        }
      }
      
      console.log(`[BAWorkflow:ticket_generation] Generated ${tickets.length} tickets`)
      
      return {
        ...state,
        tickets,
        metadata: {
          ...state.metadata,
          ticketGenerationComplete: true,
          ticketsGenerated: tickets.length
        }
      }
    } catch (error) {
      console.error('[BAWorkflow:ticket_generation] Error:', error.message)
      return {
        ...state,
        errors: state.errors.concat({ node: 'ticket_generation', message: error.message })
      }
    }
  }

  /**
   * Validation node - Ticket-ek validálása
   */
  async validationNode(state) {
    console.log('[BAWorkflow:validation] Validating', state.tickets.length, 'tickets')
    
    try {
      const validations = state.tickets.map((ticket, index) => {
        const validation = this.groundingService.validateTicket(ticket, { rowIndex: index })
        
        // Compliance check ha van service
        if (this.complianceService) {
          try {
            const compliance = this.complianceService.evaluateTicket(ticket)
            validation.compliance = compliance
          } catch (complianceError) {
            console.warn(`[BAWorkflow:validation] Compliance check failed for ticket ${index}:`, complianceError.message)
          }
        }
        
        return {
          ticketId: ticket.id,
          ...validation
        }
      })
      
      const avgConfidence = validations.reduce((sum, v) => sum + v.confidence, 0) / validations.length
      console.log(`[BAWorkflow:validation] Average confidence: ${avgConfidence.toFixed(3)}`)
      
      return {
        ...state,
        validations,
        metadata: {
          ...state.metadata,
          validationComplete: true,
          averageConfidence: avgConfidence
        }
      }
    } catch (error) {
      console.error('[BAWorkflow:validation] Error:', error.message)
      return {
        ...state,
        errors: state.errors.concat({ node: 'validation', message: error.message })
      }
    }
  }

  /**
   * Stakeholder Identification node - Stakeholder azonosítás
   */
  async stakeholderIdentificationNode(state) {
    console.log('[BAWorkflow:stakeholder] Identifying stakeholders from', state.tickets.length, 'tickets')
    
    try {
      let stakeholders = []
      
      if (this.stakeholderService) {
        stakeholders = this.stakeholderService.identifyStakeholders(state.tickets)
        console.log(`[BAWorkflow:stakeholder] Identified ${stakeholders.length} stakeholders`)
      } else {
        console.warn('[BAWorkflow:stakeholder] No StakeholderService available, skipping')
      }
      
      return {
        ...state,
        stakeholders,
        metadata: {
          ...state.metadata,
          stakeholderIdentificationComplete: true,
          stakeholdersIdentified: stakeholders.length
        }
      }
    } catch (error) {
      console.error('[BAWorkflow:stakeholder] Error:', error.message)
      return {
        ...state,
        errors: state.errors.concat({ node: 'stakeholder', message: error.message })
      }
    }
  }

  /**
   * Strategic Analysis node - PESTLE/SWOT elemzés
   */
  async strategicAnalysisNode(state) {
    console.log('[BAWorkflow:strategic] Performing strategic analysis on', state.tickets.length, 'tickets')
    
    try {
      const strategicData = {
        tickets: [],
        summary: {
          totalTickets: state.tickets.length,
          analysisComplete: false
        }
      }
      
      if (this.strategicAnalysisService) {
        for (const ticket of state.tickets) {
          try {
            const analysis = this.strategicAnalysisService.analyzeTicket(ticket)
            strategicData.tickets.push({
              ticketId: ticket.id,
              pestle: analysis._strategic?.pestle,
              swot: analysis._strategic?.swot,
              recommendations: analysis._strategic?.recommendations
            })
          } catch (analysisError) {
            console.warn(`[BAWorkflow:strategic] Analysis failed for ticket ${ticket.id}:`, analysisError.message)
          }
        }
        
        strategicData.summary.analysisComplete = true
        console.log(`[BAWorkflow:strategic] Analyzed ${strategicData.tickets.length} tickets`)
      } else {
        console.warn('[BAWorkflow:strategic] No StrategicAnalysisService available, skipping')
      }
      
      return {
        ...state,
        strategicData,
        metadata: {
          ...state.metadata,
          strategicAnalysisComplete: true
        }
      }
    } catch (error) {
      console.error('[BAWorkflow:strategic] Error:', error.message)
      return {
        ...state,
        errors: state.errors.concat({ node: 'strategic', message: error.message })
      }
    }
  }

  /**
   * Finalization node - Végső összefoglalás és cleanup
   */
  async finalizationNode(state) {
    console.log('[BAWorkflow:finalization] Finalizing workflow results')
    
    try {
      // Hibák összesítése
      const hasErrors = state.errors.length > 0
      if (hasErrors) {
        console.warn(`[BAWorkflow:finalization] Workflow completed with ${state.errors.length} errors`)
      }
      
      // Metadata bővítése
      const finalMetadata = {
        ...state.metadata,
        endTime: new Date().toISOString(),
        duration: Date.now() - new Date(state.metadata.startTime).getTime(),
        success: !hasErrors,
        errorCount: state.errors.length
      }
      
      return {
        ...state,
        metadata: finalMetadata
      }
    } catch (error) {
      console.error('[BAWorkflow:finalization] Error:', error.message)
      return {
        ...state,
        errors: state.errors.concat({ node: 'finalization', message: error.message })
      }
    }
  }

  /**
   * Excel sor -> Ticket konverzió
   * @param {Array} row - Excel sor (array)
   * @param {number} index - Sor index
   * @returns {Object} Ticket objektum
   */
  rowToTicket(row, index) {
    // Egyszerű mapping - a server.js-ben van a teljes logika
    // Itt csak alapértelmezett ticket struktúrát adunk vissza
    return {
      id: `MVM-${1000 + index}`,
      summary: row[0] || '',
      priority: row[1] || 'Medium',
      assignee: row[2] || 'Unassigned',
      epic: row[3] || 'No Epic',
      acceptanceCriteria: row[4] ? [row[4]] : [],
      createdAt: new Date().toISOString()
    }
  }
}

export default BAWorkflow

