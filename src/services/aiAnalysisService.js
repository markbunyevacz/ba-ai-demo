/**
 * AI Analysis Service
 * Uses OpenAI GPT models to analyze document content and extract structured requirements
 */

import OpenAI from 'openai'

class AIAnalysisService {
  constructor(options = {}) {
    // Determine provider (openai or openrouter)
    this.provider = options.provider || process.env.AI_PROVIDER || 'openai'
    this.model = options.model || this._getDefaultModel()
    
    // Initialize client based on provider
    if (this.provider === 'openrouter') {
      this.client = new OpenAI({
        apiKey: process.env.OPENROUTER_API_KEY,
        baseURL: 'https://openrouter.ai/api/v1',
        defaultHeaders: {
          'HTTP-Referer': process.env.APP_URL || 'http://localhost:5000',
          'X-Title': 'BA AI Assistant'
        }
      })
    } else {
      this.client = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY
      })
    }
    
    this.maxTokens = parseInt(options.maxTokens || process.env.OPENAI_MAX_TOKENS) || 4000
    this.temperature = parseFloat(options.temperature || process.env.OPENAI_TEMPERATURE) || 0.3
    
    // Usage tracking
    this.totalTokensUsed = 0
    this.apiCallCount = 0
  }

  /**
   * Get default model based on provider
   * @private
   */
  _getDefaultModel() {
    if (this.provider === 'openrouter') {
      return process.env.OPENROUTER_MODEL || 'openai/gpt-4-turbo-preview'
    }
    return process.env.OPENAI_MODEL || 'gpt-4-turbo-preview'
  }

  /**
   * Get pricing information for a model
   * @param {string} modelName - Model identifier
   * @returns {Object} Pricing info (per 1K tokens)
   * @private
   */
  _getModelPricing(modelName) {
    const pricing = {
      // OpenAI models
      'gpt-4-turbo-preview': { input: 0.01, output: 0.03 },
      'gpt-4': { input: 0.03, output: 0.06 },
      'gpt-3.5-turbo': { input: 0.0005, output: 0.0015 },
      
      // OpenRouter models (approximate)
      'openai/gpt-4-turbo-preview': { input: 0.01, output: 0.03 },
      'openai/gpt-3.5-turbo': { input: 0.0005, output: 0.0015 },
      'anthropic/claude-3-opus': { input: 0.015, output: 0.075 },
      'anthropic/claude-3-sonnet': { input: 0.003, output: 0.015 },
      'anthropic/claude-3-haiku': { input: 0.00025, output: 0.00125 },
      'meta-llama/llama-3-70b-instruct': { input: 0.0007, output: 0.0009 },
      'google/gemini-pro-1.5': { input: 0.00125, output: 0.005 }
    }
    
    return pricing[modelName] || { input: 0.01, output: 0.03 } // Default estimate
  }

  /**
   * Analyze document structure to identify Epics, User Stories, Features, and Tasks
   * @param {string} documentContent - Plain text from document
   * @returns {Promise<Object>} Structured analysis with epics, stories, features
   */
  async analyzeDocumentStructure(documentContent) {
    const prompt = `Te egy üzleti elemző asszisztens vagy. Elemezd az alábbi dokumentumot és azonosítsd:

1. EPIC-eket: Nagy munkacsomag, több user story-t foglal magában (pl. "Média monitoring rendszer")
2. USER STORY-kat: Formátum "Mint [persona]... Szeretném... Hogy..." vagy hasonló felhasználói igény
3. FEATURE-öket: Funkcionális követelmények, rendszerképességek
4. TASK-okat: Konkrét, technikai feladatok

DOKUMENTUM TARTALMA:
${documentContent.substring(0, 50000)}

VÁLASZ FORMÁTUM (JSON):
{
  "epics": [
    {
      "name": "Epic neve",
      "description": "Rövid leírás",
      "stories": ["story1_id", "story2_id"],
      "priority": "High|Medium|Low"
    }
  ],
  "stories": [
    {
      "id": "story1_id",
      "type": "Story",
      "persona": "felhasználó/szerepkör",
      "goal": "mit szeretnék elérni",
      "value": "miért fontos ez",
      "acceptanceCriteria": ["Kritérium 1", "Kritérium 2"],
      "epic": "Epic neve vagy null",
      "priority": "High|Medium|Low"
    }
  ],
  "features": [
    {
      "id": "feature1_id",
      "name": "Feature neve",
      "description": "Részletes leírás",
      "acceptanceCriteria": ["AC1", "AC2"],
      "epic": "Epic neve vagy null",
      "priority": "High|Medium|Low"
    }
  ],
  "tasks": [
    {
      "id": "task1_id",
      "name": "Task neve",
      "description": "Mit kell csinálni",
      "assignedTo": "szerepkör vagy null"
    }
  ],
  "confidence": 0.85,
  "summary": "1-2 mondatos összefoglaló a dokumentumról"
}

FONTOS: 
- Használj egyedi ID-kat minden elemhez
- A confidence 0-1 közötti érték (mennyire vagy biztos az elemzésben)
- Ha nincs egyértelmű epic, használj null-t
- Magyar szövegben is keress angol user story mintákat (As a... I want... So that...)
- Prioritást következtess ki a kulcsszavakból (sürgős, kritikus, fontos stb.)`

    return await this._callOpenAI(prompt, 'structure_analysis')
  }

  /**
   * Perform PESTLE and SWOT strategic analysis on tickets
   * @param {Array<Object>} tickets - Ticket objects to analyze
   * @returns {Promise<Object>} Strategic analysis results
   */
  async performStrategicAnalysis(tickets) {
    const ticketSummary = tickets.map(t => ({
      id: t.id,
      summary: t.summary,
      description: t.description?.substring(0, 500)
    }))

    const prompt = `Végezz PESTLE és SWOT analízist az alábbi követelményeken/ticket-eken:

KÖVETELMÉNYEK:
${JSON.stringify(ticketSummary, null, 2)}

VÁLASZ FORMÁTUM (JSON):
{
  "pestle": {
    "political": ["Politikai tényező 1", "..."],
    "economic": ["Gazdasági tényező 1", "..."],
    "social": ["Társadalmi tényező 1", "..."],
    "technological": ["Technológiai tényező 1", "..."],
    "legal": ["Jogi/szabályozási tényező 1", "..."],
    "environmental": ["Környezeti tényező 1", "..."]
  },
  "swot": {
    "strengths": ["Erősség 1", "..."],
    "weaknesses": ["Gyengeség 1", "..."],
    "opportunities": ["Lehetőség 1", "..."],
    "threats": ["Veszély 1", "..."]
  },
  "recommendations": [
    {
      "priority": "High|Medium|Low",
      "category": "Risk|Opportunity|Improvement",
      "action": "Konkrét javaslat",
      "rationale": "Miért fontos"
    }
  ],
  "confidence": 0.90,
  "executiveSummary": "2-3 mondatos összefoglaló a stratégiai helyzetről"
}

FONTOS:
- Csak releváns tényezőket említs (nem kell minden kategóriához)
- A recommendations konkrét, cselekvésre orientált legyen
- A confidence mutassa, mennyire megbízható az elemzés`

    return await this._callOpenAI(prompt, 'strategic_analysis')
  }

  /**
   * Detect process flow, dependencies, and BPMN elements from tickets
   * @param {Array<Object>} tickets - Ticket objects to analyze
   * @returns {Promise<Object>} Process flow structure
   */
  async detectProcessFlow(tickets) {
    const ticketSummary = tickets.map(t => ({
      id: t.id,
      summary: t.summary,
      description: t.description?.substring(0, 500),
      assignee: t.assignee
    }))

    const prompt = `Azonosítsd a folyamatlépéseket, függőségeket és BPMN elemeket az alábbi ticket-ekből:

TICKET-EK:
${JSON.stringify(ticketSummary, null, 2)}

VÁLASZ FORMÁTUM (JSON):
{
  "steps": [
    {
      "id": "step1",
      "ticketId": "MVM-1001",
      "name": "Lépés neve",
      "type": "task|gateway|startEvent|endEvent|intermediateEvent",
      "description": "Mit csinál",
      "dependencies": ["step0"],
      "swimlane": "Szerepkör/Csapat"
    }
  ],
  "gateways": [
    {
      "id": "gateway1",
      "type": "exclusive|parallel|inclusive",
      "name": "Döntési pont neve",
      "condition": "Mi alapján dönt"
    }
  ],
  "swimlanes": {
    "Business Analyst": ["step1", "step3"],
    "Developer": ["step2", "step4"],
    "Tester": ["step5"]
  },
  "sequenceFlows": [
    {
      "from": "step1",
      "to": "step2",
      "condition": "opcionális feltétel"
    }
  ],
  "confidence": 0.88,
  "processName": "A folyamat neve"
}

FONTOS:
- A type értékek legyenek BPMN kompatibilisek
- A dependencies mutassa a logikai sorrendet
- A swimlanes csoportosítsák a lépéseket felelős szerint
- Ha nincs explicit függőség, használj szekvenciális sorrendet`

    return await this._callOpenAI(prompt, 'process_flow')
  }

  /**
   * Private method to call OpenAI API with error handling and logging
   * @param {string} prompt - The prompt to send
   * @param {string} analysisType - Type of analysis for logging
   * @returns {Promise<Object>} Parsed JSON response
   * @private
   */
  async _callOpenAI(prompt, analysisType) {
    try {
      // Check if API key is configured for the selected provider
      const apiKey = this.provider === 'openrouter' 
        ? process.env.OPENROUTER_API_KEY 
        : process.env.OPENAI_API_KEY
        
      if (!apiKey) {
        console.warn(`[AIAnalysisService] No ${this.provider} API key configured, skipping ${analysisType}`)
        return this._getFallbackResponse(analysisType)
      }

      const startTime = Date.now()
      
      console.log(`[AIAnalysisService] Starting ${analysisType}... (Provider: ${this.provider}, Model: ${this.model})`)
      
      const response = await this.client.chat.completions.create({
        model: this.model,
        messages: [
          {
            role: 'system',
            content: 'Te egy tapasztalt üzleti elemző vagy, aki strukturált követelmény-specifikációkat készít. Mindig JSON formátumban válaszolj, tisztán és strukturáltan.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: this.maxTokens,
        temperature: this.temperature,
        response_format: { type: 'json_object' }
      })

      const duration = Date.now() - startTime
      const tokensUsed = response.usage.total_tokens
      const promptTokens = response.usage.prompt_tokens || 0
      const completionTokens = response.usage.completion_tokens || 0
      
      // Calculate cost based on model pricing
      const pricing = this._getModelPricing(this.model)
      const estimatedCost = (
        (promptTokens / 1000 * pricing.input) + 
        (completionTokens / 1000 * pricing.output)
      ).toFixed(4)

      this._trackUsage(tokensUsed)

      console.log(`[AIAnalysisService] ✓ ${analysisType} completed in ${duration}ms`)
      console.log(`[AIAnalysisService] Provider: ${this.provider} | Model: ${this.model}`)
      console.log(`[AIAnalysisService] Tokens: ${tokensUsed} (prompt: ${promptTokens}, completion: ${completionTokens})`)
      console.log(`[AIAnalysisService] Cost: $${estimatedCost}`)

      const result = JSON.parse(response.choices[0].message.content)

      return {
        ...result,
        _meta: {
          analysisType,
          duration,
          tokensUsed,
          promptTokens,
          completionTokens,
          estimatedCost: parseFloat(estimatedCost),
          model: this.model,
          provider: this.provider,
          timestamp: new Date().toISOString()
        }
      }
    } catch (error) {
      console.error(`[AIAnalysisService] ✗ ${analysisType} failed:`, error.message)
      
      if (error.code === 'insufficient_quota') {
        console.error(`[AIAnalysisService] ${this.provider} quota exceeded. Check your billing.`)
      } else if (error.code === 'invalid_api_key') {
        console.error(`[AIAnalysisService] Invalid ${this.provider} API key.`)
      } else if (error.status === 401) {
        console.error(`[AIAnalysisService] Authentication failed for ${this.provider}.`)
      }
      
      return this._getFallbackResponse(analysisType, error.message)
    }
  }

  /**
   * Get fallback response when AI analysis fails
   * @param {string} analysisType - Type of analysis
   * @param {string} errorMessage - Optional error message
   * @returns {Object} Fallback response
   * @private
   */
  _getFallbackResponse(analysisType, errorMessage = null) {
    const baseResponse = {
      error: errorMessage || 'AI analysis not available',
      fallback: true,
      confidence: 0,
      _meta: {
        analysisType,
        failed: true,
        timestamp: new Date().toISOString()
      }
    }

    switch (analysisType) {
      case 'structure_analysis':
        return {
          ...baseResponse,
          epics: [],
          stories: [],
          features: [],
          tasks: [],
          summary: 'AI elemzés nem elérhető'
        }
      case 'strategic_analysis':
        return {
          ...baseResponse,
          pestle: {
            political: [],
            economic: [],
            social: [],
            technological: [],
            legal: [],
            environmental: []
          },
          swot: {
            strengths: [],
            weaknesses: [],
            opportunities: [],
            threats: []
          },
          recommendations: [],
          executiveSummary: 'Stratégiai elemzés nem elérhető'
        }
      case 'process_flow':
        return {
          ...baseResponse,
          steps: [],
          gateways: [],
          swimlanes: {},
          sequenceFlows: [],
          processName: 'Folyamat elemzés nem elérhető'
        }
      default:
        return baseResponse
    }
  }

  /**
   * Track API usage for cost monitoring
   * @param {number} tokens - Number of tokens used
   * @private
   */
  _trackUsage(tokens) {
    this.totalTokensUsed += tokens
    this.apiCallCount += 1
  }

  /**
   * Get cost statistics for monitoring
   * @returns {Object} Usage statistics
   */
  getCostStats() {
    const pricing = this._getModelPricing(this.model)
    const avgCost = ((pricing.input + pricing.output) / 2)
    
    return {
      totalTokens: this.totalTokensUsed,
      estimatedCost: (this.totalTokensUsed / 1000 * avgCost).toFixed(4),
      callCount: this.apiCallCount,
      model: this.model,
      provider: this.provider
    }
  }

  /**
   * Reset usage statistics
   */
  resetStats() {
    this.totalTokensUsed = 0
    this.apiCallCount = 0
  }
}

export default AIAnalysisService

