import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import MoSCoWDashboard from '../MoSCoWDashboard.jsx'

const buildTicket = (overrides = {}) => ({
  id: overrides.id || 'TIC-10',
  summary: overrides.summary || 'Implement secure payment gateway updates',
  priority: overrides.priority || 'Critical',
  moscowClassification: overrides.moscowClassification || 'Must have',
  _prioritization: overrides._prioritization || {
    score: overrides.score ?? 92,
    rationale: ['Reclassified based on regulatory change']
  }
})

const sampleTickets = [
  buildTicket(),
  buildTicket({ id: 'TIC-11', summary: 'Improve audit logging', priority: 'High', moscowClassification: 'Should have', score: 72 }),
  buildTicket({ id: 'TIC-12', summary: 'Introduce optional dashboard widgets', priority: 'Low', moscowClassification: 'Could have', score: 48 })
]

const sampleSummary = {
  total: 3,
  completion: 33.3,
  readiness: 'Balanced',
  categories: {
    'Must have': { count: 1, averageScore: 92 },
    'Should have': { count: 1, averageScore: 72 },
    'Could have': { count: 1, averageScore: 48 },
    "Won't have": { count: 0, averageScore: 0 }
  },
  riskAlerts: [{ ticketId: 'TIC-10', message: 'High risk Must have item detected', score: 25 }]
}

describe('MoSCoWDashboard', () => {
  it('renders summary metrics and ticket table', () => {
    render(
      <MoSCoWDashboard
        tickets={sampleTickets}
        summary={sampleSummary}
        categories={['Must have', 'Should have', 'Could have', "Won't have"]}
      />
    )

    expect(screen.getByText('MoSCoW prioritization áttekintés')).toBeInTheDocument()
    expect(screen.getByText('Összesen: 3')).toBeInTheDocument()
    expect(screen.getByText('Kiemelt kockázatok')).toBeInTheDocument()
    expect(screen.getByText('TIC-10')).toBeInTheDocument()
    expect(screen.getByRole('combobox', { name: /TIC-10/ })).toBeInTheDocument()
  })

  it('invokes handler when classification changes', async () => {
    const onChange = vi.fn()
    const user = userEvent.setup()

    render(
      <MoSCoWDashboard
        tickets={sampleTickets}
        summary={sampleSummary}
        categories={['Must have', 'Should have', 'Could have', "Won't have"]}
        onClassificationChange={onChange}
      />
    )

    const select = screen.getByRole('combobox', { name: /TIC-10/ })
    await user.selectOptions(select, 'Should have')

    expect(onChange).toHaveBeenCalledWith('TIC-10', 'Should have')
  })
})


