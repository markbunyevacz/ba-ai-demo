import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { BPMNService } from '../bpmnService.js'

describe('BPMNService', () => {
  let service

  beforeEach(() => {
    service = new BPMNService()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  const tickets = [
    {
      id: 'TIC-1',
      summary: 'Start the onboarding process',
      description: 'Trigger initial workflow',
      assignee: 'Operations',
      priority: 'High'
    },
    {
      id: 'TIC-2',
      summary: 'If user submits documents, review them',
      description: 'Conditional review step',
      assignee: 'Compliance',
      priority: 'Medium',
      acceptanceCriteria: ['When all documents are valid, approve the request.']
    },
    {
      id: 'TIC-3',
      summary: 'Complete onboarding',
      description: 'Notify stakeholders and finalize',
      assignee: 'Operations',
      priority: 'Low'
    }
  ]

  it('analyzes workflow structure with gateways and metadata', () => {
    const workflow = service.analyzeWorkflow(tickets)

    expect(workflow.steps).toHaveLength(3)
    expect(workflow.gateways.length).toBeGreaterThanOrEqual(1)
    expect(workflow.metadata.totalTickets).toBe(3)
    expect(workflow.metadata.decisionPoints).toBeGreaterThanOrEqual(1)

    const gatewayStep = workflow.steps.find(step => step.metadata.gateway)
    expect(gatewayStep.type).toBe('exclusiveGateway')
    expect(gatewayStep.metadata.gatewayKeywords).toContain('if')

    const swimlanes = workflow.swimlanes
    expect(swimlanes).toEqual([
      { id: 'Operations', label: 'Operations', steps: ['TIC-1', 'TIC-3'] },
      { id: 'Compliance', label: 'Compliance', steps: ['TIC-2'] }
    ])
  })

  it('produces BPMN XML with generated events and flows', () => {
    const workflow = service.analyzeWorkflow(tickets)
    const xml = service.generateBPMNXML(workflow)

    expect(xml).toContain('<bpmn:definitions')
    expect(xml).toContain('StartEvent_TIC-1')
    expect(xml).toContain('EndEvent_TIC-3')
    expect(xml).toContain('Gateway_TIC-2')
    expect(xml).toContain('Gateway_TIC-3')
    expect(xml).toContain('Flow_1')
  })

  it('returns fallback diagram when no tickets provided', () => {
    const workflow = service.analyzeWorkflow([])
    const xml = service.generateBPMNXML(workflow)

    expect(workflow.steps).toHaveLength(0)
    expect(xml).toContain('Process_Empty')
    expect(xml).toContain('StartEvent_Empty')
    expect(xml).toContain('EndEvent_Empty')
  })

  it('detects gateways based on conditional language', () => {
    const gateways = service.detectGateways(tickets)

    expect(gateways.length).toBeGreaterThan(0)
    const complianceGateway = gateways.find(gateway => gateway.ticketId === 'TIC-2')
    expect(complianceGateway).toMatchObject({
      id: 'Gateway_TIC-2',
      type: 'exclusiveGateway'
    })
    expect(complianceGateway.conditions.length).toBeGreaterThan(0)
  })

  it('maps dependencies including gateway branches', () => {
    const workflow = service.analyzeWorkflow(tickets)
    const dependencies = workflow.dependencies

    expect(dependencies.length).toBeGreaterThan(0)
  })

  it('throws when analyzing invalid tickets input', () => {
    expect(() => service.analyzeWorkflow(null)).toThrow('Tickets must be provided as an array')
  })

  it('throws when generating BPMN without steps', () => {
    expect(() => service.generateBPMNXML({})).toThrow('Workflow with steps is required to generate BPMN XML')
  })
})
