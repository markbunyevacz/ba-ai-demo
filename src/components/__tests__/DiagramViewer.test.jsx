import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import DiagramViewer from '../DiagramViewer.jsx'

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

vi.mock('../DiagramEditor.jsx', () => ({
  __esModule: true,
  default: ({ onRegenerate }) => (
    <button type="button" onClick={() => onRegenerate('graph TD;A-->C')}>
      Regenerate Diagram
    </button>
  )
}))

vi.mock('../DiagramExport.jsx', () => ({
  __esModule: true,
  default: () => (
    <div>
      <p>Export Options</p>
      <button type="button">PNG letöltése</button>
    </div>
  )
}))

describe('DiagramViewer', () => {
  beforeEach(() => {
    clientMocks.renderDefinition.mockReset()
    clientMocks.renderDefinition.mockResolvedValue({
      svg: '<svg data-testid="updated-svg"></svg>',
      png: 'data:image/png;base64,123',
      xml: '<xml />'
    })
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('renders placeholder when no diagram provided', () => {
    render(<DiagramViewer diagram={null} />)
    expect(screen.getByText('Nincs megjeleníthető diagram.')).toBeInTheDocument()
  })

  it('renders preview with metadata when diagram exists', () => {
    render(
      <DiagramViewer
        diagram={{
          id: 'diag-1',
          type: 'bpmn',
          svg: '<svg data-testid="diagram-svg"></svg>',
          metadata: {
            generatedAt: '2024-01-01T00:00:00Z',
            tickets: 3
          }
        }}
      />
    )

    expect(screen.getByText('Modellezési munkapad')).toBeInTheDocument()
    expect(screen.getByText(/ID: diag-1/)).toBeInTheDocument()
    expect(screen.getByTestId('diagram-svg')).toBeInTheDocument()
  })

  it('shows export tab content', async () => {
    const user = userEvent.setup()
    render(
      <DiagramViewer
        diagram={{
          id: 'diag-1',
          type: 'bpmn',
          svg: '<svg data-testid="diagram-svg"></svg>',
          metadata: {}
        }}
      />
    )

    await user.click(screen.getByRole('button', { name: 'Export' }))
    expect(screen.getByText('Export Options')).toBeInTheDocument()
  })

  it('handles PNG export when available', async () => {
    const user = userEvent.setup()
    render(
      <DiagramViewer
        diagram={{
          id: 'diag-1',
          type: 'bpmn',
          svg: '<svg data-testid="diagram-svg"></svg>',
          png: 'data:image/png;base64,AAA',
          xml: '<xml />',
          definition: 'graph TD;A-->B',
          metadata: {}
        }}
      />
    )

    await user.click(screen.getByRole('button', { name: 'Export' }))
    expect(screen.getByText('PNG letöltése')).toBeInTheDocument()
  })

  it('handles diagram regeneration via editor tab', async () => {
    const user = userEvent.setup()
    const handleRefresh = vi.fn()

    render(
      <DiagramViewer
        diagram={{
          id: 'diag-1',
          type: 'bpmn',
          svg: '<svg data-testid="diagram-svg"></svg>',
          definition: 'graph TD;A-->B',
          metadata: {}
        }}
        onRefresh={handleRefresh}
      />
    )

    await user.click(screen.getByRole('button', { name: 'Szerkesztő' }))
    await user.click(screen.getByRole('button', { name: 'Regenerate Diagram' }))

    await waitFor(() => {
      expect(clientMocks.renderDefinition).toHaveBeenCalledWith('graph TD;A-->C', ['svg', 'png', 'xml'])
    })

    expect(handleRefresh).toHaveBeenCalled()
  })

  it('displays error message when regeneration fails', async () => {
    const user = userEvent.setup()
    clientMocks.renderDefinition.mockRejectedValueOnce(new Error('render failed'))

    render(
      <DiagramViewer
        diagram={{
          id: 'diag-1',
          type: 'bpmn',
          svg: '<svg data-testid="diagram-svg"></svg>',
          definition: 'graph TD;A-->B',
          metadata: {}
        }}
      />
    )

    await user.click(screen.getByRole('button', { name: 'Szerkesztő' }))
    await user.click(screen.getByRole('button', { name: 'Regenerate Diagram' }))

    await waitFor(() => {
      expect(screen.getByText('render failed')).toBeInTheDocument()
    })
  })
})
