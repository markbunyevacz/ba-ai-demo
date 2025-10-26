/**
 * Monitoring Service for AI Output Tracking
 * Tracks hallucinations, performance metrics, and quality indicators
 */

import { QUALITY_METRICS, ERROR_MESSAGES } from '../config/knowledgeBase.js'

class MonitoringService {
  constructor() {
    this.metrics = {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      hallucinationsDetected: 0,
      averageConfidence: 0,
      averageProcessingTime: 0,
      totalTicketsGenerated: 0,
      validationFailures: 0,
      jiraApiCalls: {
        total: 0,
        success: 0,
        failed: 0,
        rateLimited: 0
      },
      stakeholderExtraction: {
        runs: 0,
        totalStakeholders: 0,
        validStakeholders: 0,
        issues: 0,
        hallucinations: 0,
        accuracy: 0
      },
      documentParsing: {
        total: 0,
        success: 0,
        failed: 0,
        lastError: null
      },
      bpmnGeneration: {
        total: 0,
        success: 0,
        failed: 0,
        averageQualityScore: 0
      }
    }
    
    this.sessionData = []
    this.alerts = []
    this.performanceHistory = []
    this.jiraCallHistory = []
    this.stakeholderHistory = []
    this.documentParsingHistory = []
    this.bpmnQualityHistory = []
    this.initializeMonitoring()
  }

  /**
   * Initialize monitoring system
   */
  initializeMonitoring() {
    // Set up performance monitoring
    this.startTime = Date.now()
    this.requestCount = 0
    this.totalProcessingTime = 0
    
    // Initialize alert thresholds
    this.thresholds = {
      maxHallucinationRate: 0.1, // 10%
      minConfidenceThreshold: 0.7,
      maxProcessingTime: 5000, // 5 seconds
      maxMemoryUsage: 100 * 1024 * 1024 // 100MB
    }
  }

  /**
   * Track a new request
   * @param {Object} requestData - Request information
   */
  trackRequest(requestData) {
    this.metrics.totalRequests++
    this.requestCount++
    
    const session = {
      id: `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date().toISOString(),
      startTime: Date.now(),
      ...requestData
    }
    
    this.sessionData.push(session)
    return session.id
  }

  /**
   * Track request completion
   * @param {string} sessionId - Session identifier
   * @param {Object} result - Request result
   */
  trackCompletion(sessionId, result) {
    const session = this.sessionData.find(s => s.id === sessionId)
    if (!session) return

    const processingTime = Date.now() - session.startTime
    session.processingTime = processingTime
    session.result = result
    session.completed = true

    // Update metrics
    this.totalProcessingTime += processingTime
    this.metrics.averageProcessingTime = this.totalProcessingTime / this.requestCount

    if (result.success) {
      this.metrics.successfulRequests++
      this.metrics.totalTicketsGenerated += result.ticketsGenerated || 0
      
      // Update confidence metrics
      if (result.averageConfidence) {
        this.metrics.averageConfidence = 
          (this.metrics.averageConfidence * (this.metrics.successfulRequests - 1) + result.averageConfidence) / 
          this.metrics.successfulRequests
      }
    } else {
      this.metrics.failedRequests++
    }

    // Check for performance issues
    this.checkPerformanceThresholds(session)
  }

  /**
   * Track hallucination detection
   * @param {Object} hallucinationData - Hallucination information
   */
  trackHallucination(hallucinationData) {
    this.metrics.hallucinationsDetected++
    
    const alert = {
      type: 'hallucination',
      severity: 'high',
      timestamp: new Date().toISOString(),
      data: hallucinationData,
      message: `Hallucination detected: ${hallucinationData.reason}`
    }
    
    this.alerts.push(alert)
    
    // Check if hallucination rate exceeds threshold
    const hallucinationRate = this.metrics.hallucinationsDetected / this.metrics.totalRequests
    if (hallucinationRate > this.thresholds.maxHallucinationRate) {
      this.createAlert('high_hallucination_rate', {
        rate: hallucinationRate,
        threshold: this.thresholds.maxHallucinationRate
      })
    }
  }

  /**
   * Track validation failure
   * @param {Object} validationData - Validation failure information
   */
  trackValidationFailure(validationData) {
    this.metrics.validationFailures++
    
    const alert = {
      type: 'validation_failure',
      severity: 'medium',
      timestamp: new Date().toISOString(),
      data: validationData,
      message: `Validation failed: ${validationData.reason}`
    }
    
    this.alerts.push(alert)
  }

  /**
   * Track Jira API call outcome
   * @param {Object} data - Call details
   */
  trackJiraApiCall(data = {}) {
    const {
      endpoint = 'unknown',
      method = 'GET',
      status = null,
      duration = null,
      success = false,
      error = null,
      rateLimited = false
    } = data

    this.metrics.jiraApiCalls.total += 1
    if (success) {
      this.metrics.jiraApiCalls.success += 1
    } else {
      this.metrics.jiraApiCalls.failed += 1
    }

    if (rateLimited) {
      this.metrics.jiraApiCalls.rateLimited += 1
    }

    this.jiraCallHistory.push({
      endpoint,
      method,
      status,
      duration,
      success,
      error,
      rateLimited,
      timestamp: new Date().toISOString()
    })

    // Keep recent history manageable
    if (this.jiraCallHistory.length > 200) {
      this.jiraCallHistory.shift()
    }
  }

  /**
   * Track stakeholder extraction metrics
   * @param {Object} data - Extraction details
   */
  trackStakeholderAccuracy(data = {}) {
    const {
      totalStakeholders = 0,
      validStakeholders = 0,
      issues = 0,
      warnings = 0,
      hallucinations = 0,
      accuracy = null,
      source = 'unknown'
    } = data

    const metrics = this.metrics.stakeholderExtraction
    metrics.runs += 1
    metrics.totalStakeholders += totalStakeholders
    metrics.validStakeholders += validStakeholders
    metrics.issues += issues
    metrics.hallucinations += hallucinations

    const calculatedAccuracy = accuracy !== null && accuracy !== undefined
      ? accuracy
      : (totalStakeholders > 0 ? validStakeholders / totalStakeholders : 1)

    // Running average accuracy
    metrics.accuracy = Number(((metrics.accuracy * (metrics.runs - 1) + calculatedAccuracy) / metrics.runs).toFixed(4))

    this.stakeholderHistory.push({
      totalStakeholders,
      validStakeholders,
      issues,
      warnings,
      hallucinations,
      accuracy: calculatedAccuracy,
      source,
      timestamp: new Date().toISOString()
    })

    if (this.stakeholderHistory.length > 200) {
      this.stakeholderHistory.shift()
    }
  }

  /**
   * Track document parsing outcomes
   * @param {Object} data - Parsing details
   */
  trackDocumentParsing(data = {}) {
    const {
      fileType = 'unknown',
      success = true,
      error = null,
      processingTime = null,
      metadata = {}
    } = data

    const metrics = this.metrics.documentParsing
    metrics.total += 1
    if (success) {
      metrics.success += 1
    } else {
      metrics.failed += 1
      metrics.lastError = error
    }

    this.documentParsingHistory.push({
      fileType,
      success,
      error,
      processingTime,
      metadata,
      timestamp: new Date().toISOString()
    })

    if (this.documentParsingHistory.length > 200) {
      this.documentParsingHistory.shift()
    }
  }

  /**
   * Track BPMN generation quality metrics
   * @param {Object} data - BPMN quality details
   */
  trackBpmnQuality(data = {}) {
    const {
      success = true,
      qualityScore = 1,
      issues = [],
      warnings = [],
      metadata = {}
    } = data

    const metrics = this.metrics.bpmnGeneration
    metrics.total += 1
    if (success) {
      metrics.success += 1
    } else {
      metrics.failed += 1
    }

    const clampedScore = Number(Math.min(Math.max(qualityScore, 0), 1).toFixed(4))
    metrics.averageQualityScore = Number(((metrics.averageQualityScore * (metrics.total - 1) + clampedScore) / metrics.total).toFixed(4))

    this.bpmnQualityHistory.push({
      success,
      qualityScore: clampedScore,
      issues,
      warnings,
      metadata,
      timestamp: new Date().toISOString()
    })

    if (this.bpmnQualityHistory.length > 200) {
      this.bpmnQualityHistory.shift()
    }
  }

  /**
   * Check performance thresholds and create alerts
   * @param {Object} session - Session data
   */
  checkPerformanceThresholds(session) {
    // Check processing time
    if (session.processingTime > this.thresholds.maxProcessingTime) {
      this.createAlert('slow_processing', {
        processingTime: session.processingTime,
        threshold: this.thresholds.maxProcessingTime
      })
    }

    // Check confidence levels
    if (session.result && session.result.averageConfidence < this.thresholds.minConfidenceThreshold) {
      this.createAlert('low_confidence', {
        confidence: session.result.averageConfidence,
        threshold: this.thresholds.minConfidenceThreshold
      })
    }

    // Check memory usage (if available)
    if (process.memoryUsage && process.memoryUsage().heapUsed > this.thresholds.maxMemoryUsage) {
      this.createAlert('high_memory_usage', {
        memoryUsage: process.memoryUsage().heapUsed,
        threshold: this.thresholds.maxMemoryUsage
      })
    }
  }

  /**
   * Create an alert
   * @param {string} type - Alert type
   * @param {Object} data - Alert data
   */
  createAlert(type, data) {
    const alert = {
      type,
      severity: this.getAlertSeverity(type),
      timestamp: new Date().toISOString(),
      data,
      message: this.getAlertMessage(type, data)
    }
    
    this.alerts.push(alert)
    console.warn(`🚨 Monitoring Alert: ${alert.message}`)
  }

  /**
   * Get alert severity based on type
   * @param {string} type - Alert type
   * @returns {string} Severity level
   */
  getAlertSeverity(type) {
    const severityMap = {
      'hallucination': 'high',
      'high_hallucination_rate': 'critical',
      'validation_failure': 'medium',
      'slow_processing': 'medium',
      'low_confidence': 'high',
      'high_memory_usage': 'high'
    }
    
    return severityMap[type] || 'low'
  }

  /**
   * Get alert message based on type and data
   * @param {string} type - Alert type
   * @param {Object} data - Alert data
   * @returns {string} Alert message
   */
  getAlertMessage(type, data) {
    const messages = {
      'hallucination': `Hallucination detected: ${data.reason}`,
      'high_hallucination_rate': `Hallucination rate ${(data.rate * 100).toFixed(1)}% exceeds threshold ${(data.threshold * 100).toFixed(1)}%`,
      'validation_failure': `Validation failed: ${data.reason}`,
      'slow_processing': `Processing time ${data.processingTime}ms exceeds threshold ${data.threshold}ms`,
      'low_confidence': `Confidence ${(data.confidence * 100).toFixed(1)}% below threshold ${(data.threshold * 100).toFixed(1)}%`,
      'high_memory_usage': `Memory usage ${(data.memoryUsage / 1024 / 1024).toFixed(1)}MB exceeds threshold ${(data.threshold / 1024 / 1024).toFixed(1)}MB`
    }
    
    return messages[type] || 'Unknown alert'
  }

  /**
   * Get current metrics
   * @returns {Object} Current metrics
   */
  getMetrics() {
    const uptime = Date.now() - this.startTime
    const successRate = this.metrics.totalRequests > 0 ? 
      (this.metrics.successfulRequests / this.metrics.totalRequests) * 100 : 0
    const hallucinationRate = this.metrics.totalRequests > 0 ? 
      (this.metrics.hallucinationsDetected / this.metrics.totalRequests) * 100 : 0

    const jiraMetrics = this.metrics.jiraApiCalls
    const jiraSuccessRate = jiraMetrics.total > 0 ? (jiraMetrics.success / jiraMetrics.total) * 100 : 0
    const jiraFailureRate = jiraMetrics.total > 0 ? (jiraMetrics.failed / jiraMetrics.total) * 100 : 0

    const stakeholderMetrics = this.metrics.stakeholderExtraction
    const stakeholderAccuracy = stakeholderMetrics.runs > 0 ? stakeholderMetrics.accuracy * 100 : 0
    const stakeholderIssueRate = stakeholderMetrics.totalStakeholders > 0
      ? (stakeholderMetrics.issues / stakeholderMetrics.totalStakeholders) * 100
      : 0

    const documentMetrics = this.metrics.documentParsing
    const documentSuccessRate = documentMetrics.total > 0 ? (documentMetrics.success / documentMetrics.total) * 100 : 0
    const documentFailureRate = documentMetrics.total > 0 ? (documentMetrics.failed / documentMetrics.total) * 100 : 0

    const bpmnMetrics = this.metrics.bpmnGeneration
    const bpmnSuccessRate = bpmnMetrics.total > 0 ? (bpmnMetrics.success / bpmnMetrics.total) * 100 : 0

    return {
      ...this.metrics,
      uptime,
      successRate: Math.round(successRate * 100) / 100,
      hallucinationRate: Math.round(hallucinationRate * 100) / 100,
      averageConfidence: Math.round(this.metrics.averageConfidence * 100) / 100,
      averageProcessingTime: Math.round(this.metrics.averageProcessingTime),
      totalSessions: this.sessionData.length,
      activeAlerts: this.alerts.filter(a => a.severity === 'high' || a.severity === 'critical').length,
      derivedMetrics: {
        jiraSuccessRate: Math.round(jiraSuccessRate * 100) / 100,
        jiraFailureRate: Math.round(jiraFailureRate * 100) / 100,
        stakeholderAccuracy: Math.round(stakeholderAccuracy * 100) / 100,
        stakeholderIssueRate: Math.round(stakeholderIssueRate * 100) / 100,
        documentSuccessRate: Math.round(documentSuccessRate * 100) / 100,
        documentFailureRate: Math.round(documentFailureRate * 100) / 100,
        bpmnSuccessRate: Math.round(bpmnSuccessRate * 100) / 100,
        bpmnAverageQualityScore: Math.round((bpmnMetrics.averageQualityScore || 0) * 100) / 100
      }
    }
  }

  /**
   * Get recent alerts
   * @param {number} limit - Number of alerts to return
   * @returns {Array} Recent alerts
   */
  getRecentAlerts(limit = 10) {
    return this.alerts
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
      .slice(0, limit)
  }

  /**
   * Get performance history
   * @param {number} hours - Hours of history to return
   * @returns {Array} Performance history
   */
  getPerformanceHistory(hours = 24) {
    const cutoffTime = Date.now() - (hours * 60 * 60 * 1000)
    return this.sessionData
      .filter(s => s.startTime > cutoffTime)
      .map(s => ({
        timestamp: s.timestamp,
        processingTime: s.processingTime,
        success: s.result?.success || false,
        confidence: s.result?.averageConfidence || 0,
        ticketsGenerated: s.result?.ticketsGenerated || 0
      }))
  }

  /**
   * Reset metrics
   */
  resetMetrics() {
    this.metrics = {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      hallucinationsDetected: 0,
      averageConfidence: 0,
      averageProcessingTime: 0,
      totalTicketsGenerated: 0,
      validationFailures: 0,
      jiraApiCalls: {
        total: 0,
        success: 0,
        failed: 0,
        rateLimited: 0
      },
      stakeholderExtraction: {
        runs: 0,
        totalStakeholders: 0,
        validStakeholders: 0,
        issues: 0,
        hallucinations: 0,
        accuracy: 0
      },
      documentParsing: {
        total: 0,
        success: 0,
        failed: 0,
        lastError: null
      },
      bpmnGeneration: {
        total: 0,
        success: 0,
        failed: 0,
        averageQualityScore: 0
      }
    }
    
    this.sessionData = []
    this.alerts = []
    this.startTime = Date.now()
    this.requestCount = 0
    this.totalProcessingTime = 0
    this.jiraCallHistory = []
    this.stakeholderHistory = []
    this.documentParsingHistory = []
    this.bpmnQualityHistory = []
  }

  /**
   * Export monitoring data
   * @returns {Object} Exported data
   */
  exportData() {
    return {
      metrics: this.getMetrics(),
      recentAlerts: this.getRecentAlerts(50),
      performanceHistory: this.getPerformanceHistory(168), // 1 week
      thresholds: this.thresholds,
      histories: {
        jira: this.jiraCallHistory.slice(-200),
        stakeholders: this.stakeholderHistory.slice(-200),
        documents: this.documentParsingHistory.slice(-200),
        bpmn: this.bpmnQualityHistory.slice(-200)
      },
      exportTimestamp: new Date().toISOString()
    }
  }
}

export default MonitoringService
