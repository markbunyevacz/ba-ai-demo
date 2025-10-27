import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import DiagramEditor, { normalizeDefinition, hasDefinitionChanged } from '../DiagramEditor.jsx'

const clientMocks = vi.hoisted(() => ({
  renderDefinition: vi.fn(),
  generateFromTickets: vi.fn()
}))

vi.mock('../../services/diagramClient.js', () => ({
  __esModule: true,
  default: clientMocks,
  renderDefinition: clientMocks.renderDefinition,
  generateFromTickets: clientMocks.generateFromTickets
}))

describe('DiagramEditor', () => {
  beforeEach(() => {
    clientMocks.renderDefinition.mockResolvedValue({ svg: '<svg id="diagram"></svg>' })
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('renders initial preview for provided definition', async () => {
    render(<DiagramEditor initialDefinition={'graph TD;A-->B'} />)

    await waitFor(() => {
      expect(clientMocks.renderDefinition).toHaveBeenCalledWith('graph TD;A-->B', ['svg'])
    })

    expect(screen.getByText('Generált előnézet')).toBeInTheDocument()
  })

  it('updates diagram preview when definition changes', async () => {
    const user = userEvent.setup()
    render(<DiagramEditor initialDefinition={'graph TD;A-->B'} />)

    await waitFor(() => {
      expect(clientMocks.renderDefinition).toHaveBeenCalled()
    })

    clientMocks.renderDefinition.mockResolvedValueOnce({ svg: '<svg id="updated"></svg>' })

    await user.clear(screen.getByRole('textbox'))
    await user.type(screen.getByRole('textbox'), 'graph TD;X-->Y')

    await user.click(screen.getByRole('button', { name: 'Előnézet frissítése' }))

    await waitFor(() => {
      const calls = clientMocks.renderDefinition.mock.calls
      expect(calls.length).toBeGreaterThan(1)
      const [initialDefinition] = calls[0]
      expect(initialDefinition).toBe('graph TD;A-->B')
      const [updatedDefinition, formats] = calls[calls.length - 2]
      expect(updatedDefinition).toBe('graph TD;X-->Y')
      expect(formats).toEqual(['svg'])
    })
  })

  it('calls onRegenerate and updates definition', async () => {
    const user = userEvent.setup()
    const onRegenerate = vi.fn().mockResolvedValue({ definition: 'graph TD;B-->C' })

    render(<DiagramEditor initialDefinition={'graph TD;A-->B'} onRegenerate={onRegenerate} />)

    await waitFor(() => {
      expect(clientMocks.renderDefinition).toHaveBeenCalled()
    })

    clientMocks.renderDefinition.mockResolvedValueOnce({ svg: '<svg id="regen"></svg>' })

    await user.click(screen.getByRole('button', { name: 'BPMN újragenerálása' }))

    await waitFor(() => {
      expect(onRegenerate).toHaveBeenCalledWith('graph TD;A-->B')
    })

    await waitFor(() => {
      expect(clientMocks.renderDefinition).toHaveBeenLastCalledWith('graph TD;B-->C', ['svg'])
    })
  })

  it('normalizes definitions consistently', () => {
    expect(normalizeDefinition('  graph   TD; A-->B  ')).toBe('graph TD; A-->B')
    expect(normalizeDefinition('')).toBe('')
  })

  it('detects definition changes', () => {
    expect(hasDefinitionChanged('graph TD;A-->B', 'graph TD;A-->B')).toBe(false)
    expect(hasDefinitionChanged('graph TD;A-->B', 'graph TD; A-->B')).toBe(true)
    expect(hasDefinitionChanged('graph TD;A-->B', 'graph TD;B-->C')).toBe(true)
  })
})
