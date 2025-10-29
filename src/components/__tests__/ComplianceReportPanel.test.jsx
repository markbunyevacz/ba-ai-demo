import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'

import ComplianceReportPanel from '../ComplianceReportPanel.jsx'

const mocks = vi.hoisted(() => ({
  generateReportMock: vi.fn(),
  trackRequestMock: vi.fn(() => 'session-1'),
  trackCompletionMock: vi.fn(),
  exportJsonMock: vi.fn(),
  exportCsvMock: vi.fn()
}))

vi.mock('../../services/complianceClient.js', () => ({
  __esModule: true,
  default: {
    fetchStandards: vi.fn(),
    generateReport: mocks.generateReportMock,
    validateTickets: vi.fn()
  },
  generateReport: mocks.generateReportMock
}))

vi.mock('../../services/monitoringService.js', () => ({
  __esModule: true,
  default: {
    trackRequest: mocks.trackRequestMock,
    trackCompletion: mocks.trackCompletionMock
  }
}))

vi.mock('../../utils/exportUtils.js', () => ({
  __esModule: true,
  exportAsJson: (...args) => mocks.exportJsonMock(...args),
  exportAsCsv: (...args) => mocks.exportCsvMock(...args)
}))

const sampleReport = {
  totalTickets: 2,
  averageScore: 0.74,
  standardBreakdown: {
    PMI: { averageScore: 0.8, complianceRate: 0.9, evaluated: 2 }
  },
  nonCompliantTickets: [
    {
      ticketId: 'TIC-200',
      status: 'gap',
      overallScore: 0.5,
      gaps: [{ message: 'Add value assessment.' }]
    }
  ],
  timestamp: '2025-10-29T12:00:00.000Z'
}

describe('ComplianceReportPanel', () => {
  beforeEach(() => {
    mocks.generateReportMock.mockResolvedValue(sampleReport)
    mocks.trackRequestMock.mockReturnValue('session-1')
    mocks.trackCompletionMock.mockReset()
    mocks.exportJsonMock.mockReset()
    mocks.exportCsvMock.mockReset()
  })

  it('generates report and triggers exports', async () => {
    render(<ComplianceReportPanel tickets={[{ id: 'TIC-200' }]} />)

    const button = screen.getByRole('button', { name: /Compliance riport/i })
    fireEvent.click(button)

    await waitFor(() => {
      expect(screen.getAllByText(/Non-Compliant Tickets/i).length).toBeGreaterThan(0)
    })

    fireEvent.click(screen.getByText(/Export JSON/i))
    fireEvent.click(screen.getByText(/Export CSV/i))

    expect(mocks.generateReportMock).toHaveBeenCalled()
    expect(mocks.trackCompletionMock).toHaveBeenCalledWith('session-1', expect.objectContaining({ success: true }))
    expect(mocks.exportJsonMock).toHaveBeenCalled()
    expect(mocks.exportCsvMock).toHaveBeenCalled()
  })
})


