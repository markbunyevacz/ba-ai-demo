import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import React from 'react'
import FlowchartGenerator from '../FlowchartGenerator.jsx'

const mockWorkflow = {
  steps: [
    {
      id: 'step-1',
      name: 'Start',
      description: 'Initial step',
      assignee: 'Team A',
      type: 'startEvent',
      index: 0,
      metadata: { priority: 'High', gateway: false, isStart: true, isEnd: false }
    },
    {
      id: 'step-2',
      name: 'Decision',
      description: 'Branching logic',
      assignee: 'Team B',
      type: 'exclusiveGateway',
      index: 1,
      metadata: { priority: 'Medium', gateway: true, isStart: false, isEnd: false }
    },
    {
      id: 'step-3',
      name: 'Finish',
      description: 'Final step',
      assignee: 'Team A',
      type: 'endEvent',
      index: 2,
      metadata: { priority: 'Low', gateway: false, isStart: false, isEnd: true }
    }
  ],
  dependencies: [
    { id: 'dep-1', from: 'step-1', to: 'step-2', type: 'sequence', label: 'next' },
    { id: 'dep-2', from: 'step-2', to: 'step-3', type: 'gateway', label: 'approve' }
  ],
  swimlanes: [
    { id: 'Team A', label: 'Team A', steps: ['step-1', 'step-3'] },
    { id: 'Team B', label: 'Team B', steps: ['step-2'] }
  ],
  metadata: {
    totalTickets: 3,
    decisionPoints: 1,
    generatedAt: '2024-01-01T00:00:00.000Z'
  }
}

vi.mock('../../services/bpmnService', () => ({
  __esModule: true,
  default: {
    analyzeWorkflow: vi.fn(() => mockWorkflow)
  }
}))

const ReactFlowContext = React.createContext({})

vi.mock('react-flow-renderer/dist/style.css', () => ({}), { virtual: true })

vi.mock('react-flow-renderer', () => {
  const React = require('react')
  const addEdgeMock = (connection, edges) => [...edges, { id: `${connection.source}-${connection.target}`, ...connection }]

  const useStateWrapper = (initial) => {
    const [value, setValue] = React.useState(initial)
    const handler = React.useCallback((update) => {
      if (typeof update === 'function') {
        setValue(prev => update(prev))
      }
    }, [])
    return [value, setValue, handler]
  }

  const MockReactFlow = ({ nodes, edges, onNodeDoubleClick, onNodeDragStop, onConnect, children }) => (
    <div data-testid="react-flow">
      <div data-testid="nodes-list">
        {nodes.map(node => (
          <div
            key={node.id}
            data-node-id={node.id}
            data-node-x={node.position.x}
            data-node-y={node.position.y}
            data-node-opacity={node.style.opacity ?? 1}
          >
            {node.data.label}
            <button type="button" onClick={() => onNodeDoubleClick?.(null, node)}>select-{node.id}</button>
            <button type="button" onClick={() => onNodeDragStop?.(null, { ...node, position: { x: node.position.x + 10, y: node.position.y + 5 } })}>drag-{node.id}</button>
            <button type="button" onClick={() => onConnect?.({ source: node.id, target: 'step-3' })}>connect-{node.id}</button>
          </div>
        ))}
      </div>
      <div data-testid="edges-count">{edges.length}</div>
      <ReactFlowContext.Provider value={{ nodes, edges }}>
        {children}
      </ReactFlowContext.Provider>
    </div>
  )

  return {
    __esModule: true,
    default: MockReactFlow,
    addEdge: addEdgeMock,
    Background: ({ variant }) => <div data-testid={`background-${variant}`} />,
    Controls: () => <div data-testid="controls" />,
    MiniMap: () => <div data-testid="minimap" />,
    MarkerType: { ArrowClosed: 'ArrowClosed' },
    useNodesState: useStateWrapper,
    useEdgesState: useStateWrapper
  }
})

const sampleTickets = [
  { id: 'ticket-1', summary: 'Alpha', description: 'alpha task', assignee: 'Team A' },
  { id: 'ticket-2', summary: 'Beta if condition', description: 'beta task', assignee: 'Team B' },
  { id: 'ticket-3', summary: 'Gamma', description: 'gamma task', assignee: 'Team A' }
]

describe('FlowchartGenerator', () => {
  beforeEach(() => {
    Element.prototype.getBoundingClientRect = vi.fn(() => ({ width: 1200, height: 800, top: 0, left: 0, bottom: 800, right: 1200 }))
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('renders flowchart metadata and controls', () => {
    render(<FlowchartGenerator tickets={sampleTickets} />)

    expect(screen.getByText('Egyszerűsített folyamatábra')).toBeInTheDocument()
    expect(screen.getByText('Szerepkör szerinti szűrés')).toBeInTheDocument()
    expect(screen.getByText('Workflow metaadatok')).toBeInTheDocument()
    expect(screen.getByTestId('background-dots')).toBeInTheDocument()
    expect(screen.getByTestId('controls')).toBeInTheDocument()
    expect(screen.getByTestId('minimap')).toBeInTheDocument()
  })

  it('applies participant filter and reset correctly', async () => {
    const user = userEvent.setup()
    render(<FlowchartGenerator tickets={sampleTickets} />)

    await user.click(screen.getByRole('button', { name: 'Team B' }))

    const nodesAfterFilter = screen.getAllByTestId('nodes-list')[0].querySelectorAll('[data-node-id]')
    expect(nodesAfterFilter.length).toBe(3)
    expect(nodesAfterFilter[0].getAttribute('data-node-opacity')).toBe('0.2')
    expect(nodesAfterFilter[1].getAttribute('data-node-opacity')).toBe('1')

    await user.click(screen.getByRole('button', { name: 'Szűrés visszaállítása' }))
    const nodesAfterReset = screen.getAllByTestId('nodes-list')[0].querySelectorAll('[data-node-id]')
    nodesAfterReset.forEach(node => {
      expect(node.getAttribute('data-node-opacity')).toBe('1')
    })
  })

  it('updates layout when auto layout is triggered', async () => {
    const user = userEvent.setup()
    render(<FlowchartGenerator tickets={sampleTickets} />)

    const before = Array.from(screen.getAllByTestId('nodes-list')[0].querySelectorAll('[data-node-id]')).map(node => ({
      id: node.getAttribute('data-node-id'),
      x: Number(node.getAttribute('data-node-x')),
      y: Number(node.getAttribute('data-node-y'))
    }))

    await user.click(screen.getByRole('button', { name: 'Auto layout' }))

    const after = Array.from(screen.getAllByTestId('nodes-list')[0].querySelectorAll('[data-node-id]')).map(node => ({
      id: node.getAttribute('data-node-id'),
      x: Number(node.getAttribute('data-node-x')),
      y: Number(node.getAttribute('data-node-y'))
    }))

    expect(after).not.toEqual(before)
    expect(after[0].x).toBe(0)
    expect(after[1].x).toBe(260)
  })

  it('selects a node on double click and shows details', async () => {
    const user = userEvent.setup()
    render(<FlowchartGenerator tickets={sampleTickets} />)

    await user.click(screen.getByText('select-step-2'))

    const detailsPanel = screen.getByText('Lépés részletei').parentElement
    expect(detailsPanel).toHaveTextContent('Decision')
    expect(detailsPanel).toHaveTextContent('exclusiveGateway')
    expect(detailsPanel).toHaveTextContent('Team B')
  })

  it('invokes workflow generated callback with merged data', async () => {
    const user = userEvent.setup()
    const onWorkflowGenerated = vi.fn()
    render(<FlowchartGenerator tickets={sampleTickets} onWorkflowGenerated={onWorkflowGenerated} />)

    await user.click(screen.getByRole('button', { name: 'Mentés' }))

    expect(onWorkflowGenerated).toHaveBeenCalledTimes(1)
    const payload = onWorkflowGenerated.mock.calls[0][0]
    expect(payload.steps).toHaveLength(mockWorkflow.steps.length)
    expect(payload.dependencies).toHaveLength(mockWorkflow.dependencies.length)
    expect(payload.metadata.generatedAt).toBeDefined()
    expect(payload.layout).toBeTruthy()
  })
})

