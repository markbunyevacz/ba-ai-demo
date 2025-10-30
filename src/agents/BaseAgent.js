/**
 * BaseAgent - Közös agent infrastruktúra
 * 
 * Felelősség:
 * - Anthropic Claude API kliens wrapper
 * - Egységes hibakezelés és retry logika
 * - Token tracking és költségszámítás
 * - Health check és monitoring
 */

import Anthropic from '@anthropic-ai/sdk'
import pRetry from 'p-retry'

class BaseAgent {
  constructor(options = {}) {
    // API konfiguráció
    this.apiKey = options.apiKey || process.env.ANTHROPIC_API_KEY
    this.model = options.model || process.env.ANTHROPIC_MODEL || 'claude-3-5-sonnet-20241022'
    this.maxTokens = parseInt(options.maxTokens || process.env.ANTHROPIC_MAX_TOKENS || '4000')
    this.temperature = parseFloat(options.temperature || process.env.ANTHROPIC_TEMPERATURE || '0.3')
    this.timeout = parseInt(options.timeout || process.env.ANTHROPIC_TIMEOUT_MS || '60000')
    
    // Szolgáltatások
    this.monitoringService = options.monitoringService
    this.sessionId = options.sessionId || 'default'
    
    // Validáció
    if (!this.apiKey) {
      throw new Error('ANTHROPIC_API_KEY is required for BaseAgent')
    }
    
    // Anthropic kliens inicializálás
    this.client = new Anthropic({
      apiKey: this.apiKey,
      timeout: this.timeout
    })
    
    // Statisztikák
    this.totalTokens = 0
    this.callCount = 0
    this.totalCost = 0
    
    console.log('[BaseAgent] Initialized with model:', this.model)
  }

  /**
   * Fő végrehajtó metódus
   * @param {Object} taskDefinition - Feladat definíció
   * @param {Object} context - Kontextus információk
   * @returns {Promise<Object>} Végrehajtás eredménye
   */
  async executeTask(taskDefinition, context = {}) {
    console.log('[BaseAgent] Executing task:', taskDefinition.task || 'unknown')
    
    // Bemenet validálás
    this.validateInput(taskDefinition)
    
    // Üzenetek összeállítása
    const messages = this.buildMessages(taskDefinition, context)
    
    try {
      // API hívás retry logikával
      const response = await this.callAnthropicAPI(messages, context.options)
      
      // Kimenet validálás
      const validatedOutput = this.validateOutput(response)
      
      // Logging
      await this.logInteraction(taskDefinition, validatedOutput, {
        model: this.model,
        usage: response.usage
      })
      
      return validatedOutput
      
    } catch (error) {
      console.error('[BaseAgent] Task execution failed:', error.message)
      return this.handleError(error)
    }
  }

  /**
   * Anthropic API hívás retry logikával
   * @param {Array} messages - Üzenetek tömbje
   * @param {Object} options - További opciók
   * @returns {Promise<Object>} API válasz
   */
  async callAnthropicAPI(messages, options = {}) {
    const maxRetries = parseInt(process.env.LANGGRAPH_MAX_RETRIES || '3')
    const retryDelay = parseInt(process.env.LANGGRAPH_RETRY_DELAY_MS || '2000')
    
    console.log(`[BaseAgent] Calling Anthropic API (max retries: ${maxRetries})`)
    
    return pRetry(async (attempt) => {
      try {
        const response = await this.client.messages.create({
          model: this.model,
          max_tokens: this.maxTokens,
          temperature: this.temperature,
          messages: messages,
          ...options
        })
        
        // Token tracking
        const tokensUsed = response.usage.input_tokens + response.usage.output_tokens
        this.totalTokens += tokensUsed
        this.callCount++
        
        // Költség számítás
        const cost = this.calculateCost(response.usage)
        this.totalCost += cost
        
        console.log(`[BaseAgent] API call successful (tokens: ${tokensUsed}, cost: $${cost.toFixed(6)})`)
        
        return response
        
      } catch (apiError) {
        console.error(`[BaseAgent] API call failed (attempt ${attempt}/${maxRetries}):`, apiError.message)
        
        // Rate limit vagy timeout esetén újrapróbálkozás
        if (apiError.status === 429 || apiError.status === 503 || apiError.code === 'ETIMEDOUT') {
          throw apiError // pRetry újrapróbálja
        }
        
        // Egyéb hibák esetén nem próbáljuk újra
        throw new pRetry.AbortError(apiError)
      }
    }, {
      retries: maxRetries,
      minTimeout: retryDelay,
      factor: 2, // Exponential backoff
      onFailedAttempt: (error) => {
        console.warn(`[BaseAgent] Retry ${error.attemptNumber}/${maxRetries} after ${error.retriesLeft} retries left`)
      }
    })
  }

  /**
   * Bemenet validálás
   * @param {Object} input - Validálandó bemenet
   * @throws {Error} Ha a bemenet invalid
   */
  validateInput(input) {
    if (!input || typeof input !== 'object') {
      throw new Error('Task definition must be an object')
    }
    
    if (!input.task && !input.messages) {
      console.warn('[BaseAgent] Task definition missing task or messages field')
    }
  }

  /**
   * Kimenet validálás
   * @param {Object} output - Anthropic API válasz
   * @returns {Object} Validált kimenet
   * @throws {Error} Ha a kimenet invalid
   */
  validateOutput(output) {
    if (!output || !output.content || !Array.isArray(output.content)) {
      throw new Error('Invalid Anthropic response: missing or invalid content')
    }
    
    // Első text content kiválasztása
    const textContent = output.content.find(block => block.type === 'text')
    
    if (!textContent || !textContent.text) {
      throw new Error('Invalid Anthropic response: no text content found')
    }
    
    return {
      content: textContent.text,
      usage: output.usage,
      model: output.model,
      stopReason: output.stop_reason,
      id: output.id
    }
  }

  /**
   * Interakció naplózása
   * @param {Object} request - Kérés adatok
   * @param {Object} response - Válasz adatok
   * @param {Object} metadata - Metaadatok
   */
  async logInteraction(request, response, metadata) {
    if (!this.monitoringService) {
      console.log('[BaseAgent] No monitoring service, skipping log')
      return
    }
    
    const logData = {
      sessionId: this.sessionId,
      agentType: this.constructor.name,
      model: metadata.model || this.model,
      inputTokens: metadata.usage?.input_tokens || 0,
      outputTokens: metadata.usage?.output_tokens || 0,
      totalTokens: (metadata.usage?.input_tokens || 0) + (metadata.usage?.output_tokens || 0),
      estimatedCost: this.calculateCost(metadata.usage),
      timestamp: new Date().toISOString(),
      taskType: request.task || 'unknown'
    }
    
    console.log('[BaseAgent] Interaction logged:', JSON.stringify(logData, null, 2))
  }

  /**
   * Költség számítás
   * @param {Object} usage - Token használat (input_tokens, output_tokens)
   * @returns {number} Becsült költség USD-ben
   */
  calculateCost(usage) {
    if (!usage) return 0
    
    // Claude 3.5 Sonnet pricing (2024 October)
    // Input: $3 per 1M tokens
    // Output: $15 per 1M tokens
    const inputCostPer1M = 3.0
    const outputCostPer1M = 15.0
    
    const inputCost = (usage.input_tokens / 1000000) * inputCostPer1M
    const outputCost = (usage.output_tokens / 1000000) * outputCostPer1M
    
    return Number((inputCost + outputCost).toFixed(6))
  }

  /**
   * Hibakezelés
   * @param {Error} error - Hiba objektum
   * @returns {Object} Hiba válasz objektum
   */
  handleError(error) {
    console.error('[BaseAgent] Error details:', {
      message: error.message,
      type: error.type || 'unknown',
      status: error.status || null,
      code: error.code || null
    })
    
    // Fallback döntés
    const shouldFallback = 
      error.message.includes('API key') ||
      error.message.includes('timeout') ||
      error.message.includes('rate limit') ||
      error.message.includes('AbortError') ||
      this.callCount > 5
    
    if (shouldFallback) {
      console.warn('[BaseAgent] Fallback triggered due to error')
    }
    
    return {
      success: false,
      error: error.message,
      errorType: error.type || 'unknown',
      shouldFallback,
      timestamp: new Date().toISOString()
    }
  }

  /**
   * Agent health check
   * @returns {Promise<Object>} Health status
   */
  async healthCheck() {
    console.log('[BaseAgent] Running health check...')
    
    try {
      const response = await this.client.messages.create({
        model: this.model,
        max_tokens: 10,
        messages: [{ role: 'user', content: 'ping' }]
      })
      
      console.log('[BaseAgent] Health check passed')
      
      return {
        success: true,
        healthy: true,
        model: response.model,
        timestamp: new Date().toISOString()
      }
      
    } catch (error) {
      console.error('[BaseAgent] Health check failed:', error.message)
      
      return {
        success: false,
        healthy: false,
        error: error.message,
        timestamp: new Date().toISOString()
      }
    }
  }

  /**
   * Üzenetek összeállítása (felülírandó származtatott osztályokban)
   * @param {Object} taskDefinition - Feladat definíció
   * @param {Object} context - Kontextus
   * @returns {Array} Anthropic üzenetek tömbje
   */
  buildMessages(taskDefinition, context) {
    // Alapértelmezett implementáció
    const content = context.systemPrompt 
      ? `${context.systemPrompt}\n\n${JSON.stringify(taskDefinition, null, 2)}`
      : JSON.stringify(taskDefinition, null, 2)
    
    return [
      {
        role: 'user',
        content
      }
    ]
  }

  /**
   * Statisztikák lekérdezése
   * @returns {Object} Agent statisztikák
   */
  getStats() {
    return {
      model: this.model,
      totalCalls: this.callCount,
      totalTokens: this.totalTokens,
      totalCost: this.totalCost,
      avgTokensPerCall: this.callCount > 0 ? Math.round(this.totalTokens / this.callCount) : 0,
      avgCostPerCall: this.callCount > 0 ? (this.totalCost / this.callCount).toFixed(6) : 0
    }
  }
}

export default BaseAgent

