import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'

import ComplianceReportModal from '../ComplianceReportModal.jsx'

const sampleReport = {
  totalTickets: 3,
  averageScore: 0.72,
  timestamp: '2025-10-29T12:00:00.000Z',
  standardBreakdown: {
    PMI: { averageScore: 0.8, complianceRate: 0.9, evaluated: 3 },
    BABOK: { averageScore: 0.65, complianceRate: 0.6, evaluated: 3 }
  },
  nonCompliantTickets: [
    {
      ticketId: 'TIC-101',
      status: 'gap',
      overallScore: 0.4,
      gaps: [{ message: 'Add stakeholder matrix.' }]
    }
  ]
}

describe('ComplianceReportModal', () => {
  it('renders report data and triggers exports', () => {
    const onClose = vi.fn()
    const onExportJson = vi.fn()
    const onExportCsv = vi.fn()

    render(
      <ComplianceReportModal
        report={sampleReport}
        onClose={onClose}
        onExportJson={onExportJson}
        onExportCsv={onExportCsv}
      />
    )

    expect(screen.getByText(/Compliance Report/i)).toBeInTheDocument()
    expect(screen.getByText(/Total Tickets/i)).toBeInTheDocument()
    expect(screen.getByText('TIC-101')).toBeInTheDocument()

    fireEvent.click(screen.getByText(/Export JSON/i))
    fireEvent.click(screen.getByText(/Export CSV/i))
    fireEvent.click(screen.getByLabelText(/Close compliance report/i))

    expect(onExportJson).toHaveBeenCalled()
    expect(onExportCsv).toHaveBeenCalled()
    expect(onClose).toHaveBeenCalled()
  })
})


