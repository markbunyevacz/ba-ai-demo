import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

const renderMermaid = vi.fn(async () => '<svg></svg>')
const svgToPng = vi.fn(async () => 'data:image/png;base64,123')

vi.mock('../diagramSources.js', () => ({
  __esModule: true,
  diagramSources: {
    mermaid: Promise.resolve({ render: renderMermaid }),
    rasterizer: Promise.resolve({ svgToPng })
  }
}))

vi.mock('../bpmnService.js', () => ({
  __esModule: true,
  default: {
    analyzeWorkflow: vi.fn((tickets) => ({
      steps: tickets.map((ticket, index) => ({
        id: ticket.id || `step-${index}`,
        name: ticket.summary || `Step ${index + 1}`,
        metadata: {
          isStart: index === 0,
          isEnd: index === tickets.length - 1,
          gateway: ticket.summary?.toLowerCase().includes('if') || false
        }
      })),
      dependencies: tickets.length > 1 ? [{ from: tickets[0].id, to: tickets[1].id, label: 'next' }] : [],
      swimlanes: [
        { id: 'lane-1', label: 'Team A', steps: tickets.map(ticket => ticket.id) }
      ],
      metadata: {}
    })),
    generateBPMNXML: vi.fn(() => '<xml></xml>')
  }
}))

const sampleTickets = [
  { id: 'TIC-1', summary: 'Start process' },
  { id: 'TIC-2', summary: 'If condition then branch' }
]

describe('DiagramService', () => {
  let DiagramService
  let service

  beforeEach(async () => {
    vi.resetModules()
    ;({ DiagramService } = await import('../diagramService.js'))
    service = new DiagramService()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('generates BPMN diagram with SVG and PNG outputs', async () => {
    const diagram = await service.generateFromTickets(sampleTickets, {
      type: 'bpmn',
      formats: ['svg', 'png', 'xml'],
      diagramId: 'diag-1'
    })

    expect(diagram.id).toBe('diag-1')
    expect(diagram.type).toBe('bpmn')
    expect(diagram.svg).toBe('<svg></svg>')
    expect(diagram.png).toBe('data:image/png;base64,123')
    expect(diagram.definition).toContain('graph TD')
    expect(diagram.metadata.tickets).toBe(2)
  })

  it('renders Mermaid definition and returns PNG when requested', async () => {
    const definition = 'graph TD;A-->B'
    const diagram = await service.renderDefinition(definition, ['svg', 'png'])

    expect(diagram.definition).toBe(definition)
    expect(diagram.svg).toBe('<svg></svg>')
    expect(diagram.png).toBe('data:image/png;base64,123')
  })

  it('normalizes formats when none requested', async () => {
    const result = await service.generateFromTickets(sampleTickets, { type: 'bpmn' })
    expect(result.svg).toBe('<svg></svg>')
    expect(result.xml).toBeUndefined()
  })

  it('throws on unsupported diagram type', async () => {
    await expect(
      service.generateFromTickets(sampleTickets, { type: 'unknown' })
    ).rejects.toThrow('Unsupported diagram type')
  })

  it('throws when tickets input invalid', async () => {
    await expect(service.generateFromTickets(null)).rejects.toThrow('Tickets must be provided as an array')
  })

  it('sanitizeId handles diverse inputs', () => {
    expect(service.sanitizeId('')).toMatch(/^node_/)
    expect(service.sanitizeId('Step 1')).toBe('Step_1')
    expect(service.sanitizeId('@@Custom-ID@@')).toBe('Custom_ID')
  })

  it('formatNodeLabel normalizes content', () => {
    expect(service.formatNodeLabel('Line 1\nLine 2')).toBe('Line 1 Line 2')
    expect(service.formatNodeLabel('x'.repeat(100)).length).toBe(80)
  })

  it('formatEdgeLabel trims whitespace and length', () => {
    const label = service.formatEdgeLabel(' This    is\n\n spaced ')
    expect(label).toBe(' This is spaced ')
    expect(service.formatEdgeLabel('a'.repeat(200)).length).toBeLessThanOrEqual(40)
  })

  it('renderPng throws when svg missing', async () => {
    await expect(service.renderPng('')).rejects.toThrow('SVG content required')
  })

  it('normalizeFormats filters unsupported values', () => {
    expect(service.normalizeFormats(['SVG', 'pdf', null])).toEqual(['svg'])
  })

  it('buildMermaidDefinition returns fallback for empty tickets', () => {
    const definition = service.buildMermaidDefinition([])
    expect(definition).toContain('Start[Start]')
  })

  it('renderDefinition throws for missing definition', async () => {
    await expect(service.renderDefinition('')).rejects.toThrow('Mermaid definition is required')
  })

  it('generateMermaidDiagram returns expected assets', async () => {
    const diagram = await service.generateFromTickets(sampleTickets, {
      type: 'mermaid',
      formats: ['svg', 'png', 'xml'],
      diagramId: 'mermaid-1'
    })

    expect(diagram.type).toBe('mermaid')
    expect(diagram.svg).toBe('<svg></svg>')
    expect(diagram.png).toBe('data:image/png;base64,123')
    expect(diagram.xml).toBe('<svg></svg>')
    expect(diagram.metadata.syntax).toBe('mermaid')
  })
})
