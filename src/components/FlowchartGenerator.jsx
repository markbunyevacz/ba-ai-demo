import { useCallback, useEffect, useMemo, useState } from 'react'
import PropTypes from 'prop-types'
import ReactFlow, {
  addEdge,
  Background,
  Controls,
  MarkerType,
  MiniMap,
  useEdgesState,
  useNodesState
} from 'react-flow-renderer'

import 'react-flow-renderer/dist/style.css'

import bpmnService from '../services/bpmnService'

/**
 * Flowchart Generator Component
 * Provides a simplified flowchart visualization using react-flow-renderer with drag-and-drop editing.
 * Supports auto layout, node editing, and synchronization with BPMN workflow data.
 */
const FlowchartGenerator = ({ tickets, onWorkflowGenerated }) => {
  const [selectedNode, setSelectedNode] = useState(null)

  const workflow = useMemo(() => bpmnService.analyzeWorkflow(tickets), [tickets])

  const initialNodes = useMemo(() => {
    return (workflow.steps || []).map(step => ({
      id: step.id,
      data: {
        label: step.name,
        description: step.description,
        assignee: step.assignee,
        type: step.type,
        priority: step.metadata.priority
      },
      position: {
        x: (step.index % 4) * 240,
        y: Math.floor(step.index / 4) * 160
      },
      style: {
        borderRadius: '12px',
        border: step.metadata.gateway ? '2px solid #f97316' : '1px solid #CBD5F5',
        backgroundColor: step.type === 'startEvent'
          ? '#dcfce7'
          : step.type === 'endEvent'
            ? '#fee2e2'
            : '#f8fafc',
        color: '#1e293b',
        padding: '16px',
        width: 220,
        fontSize: 12
      }
    }))
  }, [workflow])

  const initialEdges = useMemo(() => {
    return (workflow.dependencies || []).map(dep => ({
      id: dep.id,
      source: dep.from,
      target: dep.to,
      type: 'smoothstep',
      markerEnd: {
        type: MarkerType.ArrowClosed,
        width: 18,
        height: 18,
        color: '#2563eb'
      },
      label: dep.label,
      animated: dep.type === 'gateway',
      style: {
        stroke: dep.type === 'gateway' ? '#f97316' : '#2563eb'
      }
    }))
  }, [workflow])

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes)
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges)

  useEffect(() => {
    setNodes(initialNodes.map(node => ({ ...node })))
  }, [initialNodes, setNodes])

  useEffect(() => {
    setEdges(initialEdges.map(edge => ({ ...edge })))
  }, [initialEdges, setEdges])

  const onConnect = useCallback(connection => {
    setEdges(eds => addEdge({ ...connection, type: 'smoothstep', markerEnd: { type: MarkerType.ArrowClosed } }, eds))
  }, [setEdges])

  const onNodeDragStop = useCallback((_, node) => {
    setNodes(nds => nds.map(n => n.id === node.id ? { ...n, position: node.position } : n))
  }, [setNodes])

  const onNodeDoubleClick = useCallback((_, node) => {
    setSelectedNode(node)
  }, [])

  const handleParticipantFilter = (laneId) => {
    if (!laneId) {
      setNodes(initialNodes.map(node => ({ ...node })))
      return
    }

    setNodes(nodes => nodes.map(node => ({
      ...node,
      style: {
        ...node.style,
        opacity: workflow.steps.find(step => step.id === node.id)?.assignee === laneId ? 1 : 0.2
      }
    })))
  }

  const handleResetFilter = () => {
    setNodes(nodes => nodes.map(node => ({ ...node, style: { ...node.style, opacity: 1 } })))
  }

  const handleAutoLayout = () => {
    const positionedNodes = nodes.map((node, index) => ({
      ...node,
      position: {
        x: (index % 3) * 260,
        y: Math.floor(index / 3) * 160
      }
    }))
    setNodes(positionedNodes)
  }

  const generateWorkflow = () => {
    const updatedSteps = (workflow.steps || []).map(step => {
      const node = nodes.find(n => n.id === step.id)
      return {
        ...step,
        layout: node ? { ...node.position } : step.layout
      }
    })

    const updatedDependencies = edges.map((edge, index) => ({
      id: edge.id || `Edge_${index}`,
      from: edge.source,
      to: edge.target,
      type: edge.animated ? 'gateway' : 'sequence',
      label: edge.label
    }))

    const updatedWorkflow = {
      ...workflow,
      steps: updatedSteps,
      dependencies: updatedDependencies,
      metadata: {
        ...workflow.metadata,
        generatedAt: new Date().toISOString()
      },
      layout: nodes.reduce((acc, node) => {
        acc[node.id] = node.position
        return acc
      }, {})
    }

    onWorkflowGenerated?.(updatedWorkflow)
  }

  const selectedStep = selectedNode
    ? workflow.steps.find(step => step.id === selectedNode.id)
    : null

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[2fr_1fr] gap-4">
      <div className="relative h-[600px] bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden">
        <div className="absolute inset-x-0 top-0 z-10 flex flex-wrap items-center justify-between bg-slate-50 border-b border-slate-200 px-4 py-2">
          <div className="flex items-center space-x-2">
            <h3 className="text-sm font-semibold text-slate-700">Egyszerűsített folyamatábra</h3>
            <span className="text-xs text-slate-500">{nodes.length} lépés, {edges.length} kapcsolat</span>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={handleAutoLayout}
              className="px-3 py-1 text-xs bg-slate-100 hover:bg-slate-200 rounded"
            >
              Auto layout
            </button>
            <button
              type="button"
              onClick={generateWorkflow}
              className="px-3 py-1 text-xs bg-emerald-600 hover:bg-emerald-700 text-white rounded"
            >
              Mentés
            </button>
            <button
              type="button"
              onClick={handleResetFilter}
              className="px-3 py-1 text-xs bg-indigo-100 hover:bg-indigo-200 text-indigo-700 rounded"
            >
              Szűrés visszaállítása
            </button>
          </div>
        </div>
        <div className="h-full pt-12">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onNodeDragStop={onNodeDragStop}
            onNodeDoubleClick={onNodeDoubleClick}
            fitView
          >
            <Background variant="dots" gap={12} size={1} />
            <Controls />
            <MiniMap pannable zoomable />
          </ReactFlow>
        </div>
      </div>

      <div className="space-y-4">
        <div className="bg-white border border-slate-200 rounded-lg shadow-sm p-4">
          <h4 className="text-sm font-semibold text-slate-700 mb-3">Szerepkör szerinti szűrés</h4>
          <div className="flex flex-wrap gap-2">
            {(workflow.swimlanes || []).map(lane => (
              <button
                key={lane.id}
                type="button"
                onClick={() => handleParticipantFilter(lane.id)}
                className="px-3 py-1 text-xs bg-slate-100 hover:bg-slate-200 rounded"
              >
                {lane.label}
              </button>
            ))}
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-lg shadow-sm p-4">
          <h4 className="text-sm font-semibold text-slate-700 mb-3">Lépés részletei</h4>
          {selectedStep ? (
            <div className="space-y-2 text-sm text-slate-600">
              <div className="flex justify-between">
                <span className="font-medium text-slate-700">Név:</span>
                <span>{selectedStep.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-medium text-slate-700">Típus:</span>
                <span>{selectedStep.type}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-medium text-slate-700">Felelős:</span>
                <span>{selectedStep.assignee}</span>
              </div>
              <div>
                <span className="block font-medium text-slate-700">Leírás:</span>
                <p className="mt-1 text-xs bg-slate-50 p-2 rounded">{selectedStep.description || 'Nincs leírás'}</p>
              </div>
              <div>
                <span className="block font-medium text-slate-700">Kapcsolatok:</span>
                <ul className="mt-1 text-xs space-y-1">
                  {edges.filter(edge => edge.source === selectedStep.id || edge.target === selectedStep.id).map(edge => (
                    <li key={edge.id}>
                      {edge.source === selectedStep.id ? '→' : '←'} {edge.source === selectedStep.id ? edge.target : edge.source}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ) : (
            <p className="text-xs text-slate-500">Kattintson duplán egy csomópontra a részletek megtekintéséhez.</p>
          )}
        </div>

        <div className="bg-white border border-slate-200 rounded-lg shadow-sm p-4">
          <h4 className="text-sm font-semibold text-slate-700 mb-3">Workflow metaadatok</h4>
          <dl className="grid grid-cols-2 gap-2 text-xs text-slate-600">
            <div>
              <dt className="font-medium text-slate-700">Összes ticket</dt>
              <dd>{workflow.metadata?.totalTickets || 0}</dd>
            </div>
            <div>
              <dt className="font-medium text-slate-700">Döntési pontok</dt>
              <dd>{workflow.metadata?.decisionPoints || 0}</dd>
            </div>
            <div>
              <dt className="font-medium text-slate-700">Szerepkörök</dt>
              <dd>{workflow.swimlanes?.length || 0}</dd>
            </div>
            <div>
              <dt className="font-medium text-slate-700">Generálva</dt>
              <dd>{workflow.metadata?.generatedAt ? new Date(workflow.metadata.generatedAt).toLocaleString() : '-'}</dd>
            </div>
          </dl>
        </div>
      </div>
    </div>
  )
}

FlowchartGenerator.propTypes = {
  tickets: PropTypes.arrayOf(PropTypes.object).isRequired,
  onWorkflowGenerated: PropTypes.func
}

export default FlowchartGenerator

