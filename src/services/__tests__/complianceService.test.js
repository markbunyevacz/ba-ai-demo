import { describe, it, expect, beforeEach } from 'vitest'

import { ComplianceService } from '../complianceService.js'

const buildTicket = (overrides = {}) => ({
  id: overrides.id || 'TIC-100',
  summary: overrides.summary || 'Implement regulatory reporting dashboard',
  description: overrides.description || 'As a compliance officer I need mandatory reporting to satisfy regulations.',
  acceptanceCriteria: overrides.acceptanceCriteria || ['Generate daily report', 'Provide export to Excel'],
  assignee: overrides.assignee || 'Jane Doe',
  dueDate: overrides.dueDate || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
  stakeholders: overrides.stakeholders || ['Regulatory Team', 'Operations'],
  businessValue: overrides.businessValue || 'Avoid fines and ensure compliance',
  dependencies: overrides.dependencies || ['Data Warehouse Refresh'],
  metrics: overrides.metrics || ['Report accuracy', 'Delivery time'],
  risk: overrides.risk,
  vendor: overrides.vendor
})

describe('ComplianceService', () => {
  let service

  beforeEach(() => {
    service = new ComplianceService()
  })

  it('lists available standards', () => {
    const standards = service.getAvailableStandards()
    const ids = standards.map(item => item.id)
    expect(ids).toContain('PMI')
    expect(ids).toContain('BABOK')
  })

  it('evaluates a ticket against PMI and BABOK', () => {
    const ticket = buildTicket()
    const result = service.evaluateTicket(ticket)

    expect(result.ticketId).toBe(ticket.id)
    expect(result.standards).toHaveLength(2)
    result.standards.forEach(standard => {
      expect(['compliant', 'partial', 'gap']).toContain(standard.status)
      expect(standard.score).toBeGreaterThanOrEqual(0)
      expect(standard.score).toBeLessThanOrEqual(1)
    })
  })

  it('highlights gaps for missing schedule information', () => {
    const ticket = buildTicket({ id: 'TIC-101', dueDate: '' })
    const pmiResult = service.evaluateTicket(ticket).standards.find(item => item.id === 'PMI')

    expect(pmiResult).toBeDefined()
    const warningMessages = (pmiResult?.warnings || []).map(warning => warning.message.toLowerCase())
    const hasScheduleWarning = warningMessages.some(message => message.includes('schedule') || message.includes('due'))
    expect(hasScheduleWarning).toBe(true)
  })

  it('generates a portfolio compliance report', () => {
    const tickets = [buildTicket(), buildTicket({ id: 'TIC-102', stakeholders: [] })]
    const report = service.generateReport(tickets)

    expect(report.totalTickets).toBe(2)
    expect(report.standardBreakdown.PMI).toBeDefined()
    expect(report.standardBreakdown.BABOK).toBeDefined()
    expect(Array.isArray(report.nonCompliantTickets)).toBe(true)
  })
})


