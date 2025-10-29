import { describe, it, expect, beforeEach } from 'vitest'

import { PrioritizationService } from '../prioritizationService.js'

const buildTicket = (overrides = {}) => ({
  id: overrides.id || 'TIC-1',
  summary: overrides.summary || 'Ensure regulatory compliance for new billing system',
  description: overrides.description || 'As a compliance officer, I need mandatory reporting so that we avoid fines.',
  priority: overrides.priority || 'Critical',
  businessValue: overrides.businessValue,
  dueDate: overrides.dueDate,
  riskScore: overrides.riskScore,
  dependencies: overrides.dependencies,
  stakeholderImpact: overrides.stakeholderImpact,
  acceptanceCriteria: overrides.acceptanceCriteria || []
})

describe('PrioritizationService', () => {
  let service

  beforeEach(() => {
    service = new PrioritizationService()
  })

  it('classifies ticket using priority mapping and keyword signals', () => {
    const ticket = buildTicket({
      summary: 'Legal compliance requirement for energy trading reports',
      description: 'Regulatory change requires mandatory reporting and legal validation.'
    })

    const result = service.classifyTicket(ticket)

    expect(result.moscowClassification).toBe('Must have')
    expect(result._prioritization).toBeDefined()
    expect(result._prioritization.category).toBe('Must have')
    expect(Array.isArray(result._prioritization.rationale)).toBe(true)
    expect(result._prioritization.rationale.length).toBeGreaterThan(0)
  })

  it('elevates priority for urgent due dates', () => {
    const ticket = buildTicket({
      id: 'TIC-2',
      priority: 'Medium',
      dueDate: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(),
      summary: 'Customer onboarding automation',
      description: 'Important integration work for customer onboarding.'
    })

    const result = service.classifyTicket(ticket)
    expect(service.getCategories()).toContain(result.moscowClassification)
    expect(result._prioritization.score).toBeGreaterThan(60)
  })

  it('supports batch classification and summary generation', () => {
    const tickets = service.classifyTickets([
      buildTicket({ id: 'TIC-3', priority: 'Critical' }),
      buildTicket({ id: 'TIC-4', priority: 'High', summary: 'Important customer feature' }),
      buildTicket({ id: 'TIC-5', priority: 'Low', summary: 'Future enhancement request' })
    ])

    expect(tickets).toHaveLength(3)
    tickets.forEach(item => {
      expect(service.validateCategory(item.moscowClassification)).toBe(true)
    })

    const summary = service.getPortfolioSummary(tickets)
    expect(summary.total).toBe(3)
    expect(summary.categories['Must have']).toBeDefined()
    expect(summary.categories['Must have'].count).toBeGreaterThan(0)
  })

  it('allows manual override of classification', () => {
    const tickets = service.classifyTickets([buildTicket({ id: 'TIC-6', priority: 'Low' })])

    const updated = service.updateClassification(tickets, 'TIC-6', 'Should have', {
      user: 'analyst',
      reason: 'Strategic dependency'
    })

    const target = updated.find(ticket => ticket.id === 'TIC-6')

    expect(target.moscowClassification).toBe('Should have')
    expect(target._prioritization.manualOverride).toBe(true)
    expect(target._prioritization.overrideContext.reason).toBe('Strategic dependency')
  })
})


