import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'

import CompliancePanel from '../CompliancePanel.jsx'

const buildCompliance = (overrides = {}) => ({
  ticketId: overrides.ticketId || 'TIC-1',
  status: overrides.status || 'partial',
  overallScore: overrides.overallScore ?? 0.6,
  standards: overrides.standards || [
    {
      id: 'PMI',
      name: 'PMI PMBOK',
      score: 0.65,
      status: 'partial',
      warnings: [{ message: 'Add schedule details.' }],
      gaps: [{ message: 'Missing stakeholder list.' }]
    },
    {
      id: 'BABOK',
      name: 'IIBA BABOK',
      score: 0.55,
      status: 'gap',
      warnings: [],
      gaps: [{ message: 'Document value metrics.' }]
    }
  ],
  ...overrides
})

describe('CompliancePanel', () => {
  it('renders compliance summary and recommendations', () => {
    const items = [
      { id: 'TIC-1', summary: 'Legal reporting', compliance: buildCompliance({ status: 'gap', ticketId: 'TIC-1' }) },
      { id: 'TIC-2', summary: 'Audit logs', compliance: buildCompliance({ status: 'compliant', ticketId: 'TIC-2', standards: [{ id: 'PMI', name: 'PMI PMBOK', score: 0.9, status: 'compliant', warnings: [], gaps: [] }] }) }
    ]

    render(<CompliancePanel items={items} />)

    expect(screen.getByText(/Standards Compliance/i)).toBeInTheDocument()
    expect(screen.getByText(/Compliant: 1/i)).toBeInTheDocument()
    expect(screen.getByText(/Gap: 1/i)).toBeInTheDocument()
    expect(screen.getAllByText(/PMI PMBOK/i).length).toBeGreaterThan(0)
    expect(screen.getByText(/Missing stakeholder list/i)).toBeInTheDocument()
  })

  it('returns null when no compliance data available', () => {
    const { container } = render(<CompliancePanel items={[]} />)
    expect(container.firstChild).toBeNull()
  })
})


