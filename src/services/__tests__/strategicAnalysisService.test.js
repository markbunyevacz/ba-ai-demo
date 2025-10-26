import { describe, it, expect } from 'vitest'

import StrategicAnalysisService from '../strategicAnalysisService.js'

describe('StrategicAnalysisService', () => {
  const service = new StrategicAnalysisService()

  it('extracts PESTLE signals, builds SWOT, and generates recommendations', () => {
    const ticket = {
      summary: 'Implement automated compliance checks',
      description: 'Upcoming regulation introduces non-compliance risk. We should adopt automation to maintain audit readiness and address data privacy gaps.',
      business_value: 'Government support is available for regulatory alignment and ROI improvement.',
      acceptanceCriteria: [
        'Given policy change, when auditing processes run, then ensure automation covers data privacy checks'
      ]
    }

    const analyzed = service.analyzeTicket(ticket)
    const { pestle, swot, recommendations, confidence } = analyzed._strategic

    expect(analyzed.businessValue).toBeDefined()

    expect(pestle.Legal.risks).toContain('non-compliance')
    expect(pestle.Political.opportunities).toContain('government support')
    expect(pestle.Technological.opportunities).toContain('automation')

    const swotOpportunities = swot.opportunities.map(item => item.signal)
    expect(swotOpportunities).toContain('automation')
    expect(swot.opportunities.some(item => item.factor === 'Technological')).toBe(true)

    expect(recommendations.length).toBeGreaterThan(0)
    expect(recommendations[0].action.toLowerCase()).toContain('mitigation plan')
    expect(confidence).toBeGreaterThan(0.25)
  })

  it('handles tickets without strategic cues gracefully', () => {
    const ticket = {
      summary: 'Minor UI copy update',
      description: 'Adjust button label for clarity.',
      businessValue: 'Improves usability perception.'
    }

    const analyzed = service.analyzeTicket(ticket)
    const { pestle, swot, recommendations } = analyzed._strategic

    expect(Object.values(pestle).every(factor => factor.risks.length === 0 && factor.opportunities.length === 0)).toBe(true)
    expect(swot.opportunities.length + swot.threats.length).toBeLessThanOrEqual(service.settings.swot.maxItemsPerCategory)
    expect(recommendations.length).toBeGreaterThan(0)
  })
})

