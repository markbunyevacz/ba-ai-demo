import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import FlowchartGenerator from '../FlowchartGenerator'

const tickets = [
  {
    id: 'TICKET-1',
    summary: 'Implement new feature',
    description: 'Implement feature with conditional flow',
    assignee: 'Developer',
    priority: 'High',
    acceptanceCriteria: ['Given condition A, when action B, then result C']
  },
  {
    id: 'TICKET-2',
    summary: 'Review implementation',
    description: 'Review implementation after development',
    assignee: 'Reviewer',
    priority: 'Medium'
  }
]

describe('FlowchartGenerator', () => {
  beforeEach(() => {
    Element.prototype.getBoundingClientRect = vi.fn(() => ({
      width: 1000,
      height: 600,
      top: 0,
      left: 0,
      bottom: 600,
      right: 1000
    }))
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('renders flowchart metadata', () => {
    render(<FlowchartGenerator tickets={tickets} />)

    expect(screen.getByText('Egyszerűsített folyamatábra')).toBeInTheDocument()
    expect(screen.getByText('Szerepkör szerinti szűrés')).toBeInTheDocument()
    expect(screen.getByText('Workflow metaadatok')).toBeInTheDocument()
  })

  it('invokes workflow generated callback', async () => {
    const onWorkflowGenerated = vi.fn()
    render(<FlowchartGenerator tickets={tickets} onWorkflowGenerated={onWorkflowGenerated} />)

    await userEvent.click(screen.getByRole('button', { name: 'Mentés' }))

    expect(onWorkflowGenerated).toHaveBeenCalled()
  })
})

