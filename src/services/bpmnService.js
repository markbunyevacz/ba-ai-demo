import { DOMAIN_KNOWLEDGE } from '../config/knowledgeBase.js'

/**
 * BPMN Service
 * Provides utilities to analyze ticket workflows and generate BPMN 2.0 XML representations.
 * The service is designed to be domain-agnostic while preserving existing energy law workflows.
 */
class BPMNService {
  constructor() {
    const processPatterns = DOMAIN_KNOWLEDGE?.PROCESS_PATTERNS || {}

    this.patterns = {
      taskKeywords: ['implement', 'develop', 'test', 'deploy', 'review'],
      gatewayKeywords: ['if', 'when', 'depends', 'conditional', 'either'],
      eventKeywords: ['trigger', 'start', 'end', 'complete', 'notify', 'finish', 'release'],
      sequenceIndicators: ['then', 'next', 'after', 'before', 'followed by', 'subsequently'],
      ...processPatterns
    }
  }

  /**
   * Analyze a collection of tickets and infer a workflow representation.
   * @param {Array<Object>} tickets
   * @returns {Object} workflow structure containing steps, gateways, dependencies, and swimlanes
   */
  analyzeWorkflow(tickets = []) {
    if (!Array.isArray(tickets)) {
      throw new Error('Tickets must be provided as an array')
    }

    if (tickets.length === 0) {
      return {
        steps: [],
        gateways: [],
        dependencies: [],
        swimlanes: [],
        metadata: {
          totalTickets: 0,
          generatedAt: new Date().toISOString()
        }
      }
    }

    const gateways = this.detectGateways(tickets)
    const gatewayLookup = gateways.reduce((acc, gateway) => {
      acc[gateway.ticketIndex] = gateway
      return acc
    }, {})

    const steps = tickets.map((ticket, index) => {
      const gateway = gatewayLookup[index]
      return this._buildStep(ticket, index, gateway, tickets.length)
    })

    const dependencies = this.mapDependencies(steps, gateways)
    const swimlanes = this._buildSwimlanes(steps)

    return {
      steps,
      gateways,
      dependencies,
      swimlanes,
      metadata: {
        totalTickets: tickets.length,
        decisionPoints: gateways.length,
        generatedAt: new Date().toISOString()
      }
    }
  }

  /**
   * Generate BPMN 2.0 XML for the provided workflow structure.
   * @param {Object} workflow
   * @returns {string} BPMN XML string
   */
  generateBPMNXML(workflow) {
    if (!workflow || !Array.isArray(workflow.steps)) {
      throw new Error('Workflow with steps is required to generate BPMN XML')
    }

    const steps = workflow.steps
    const flows = workflow.dependencies || []

    if (steps.length === 0) {
      return this._generateEmptyDiagram()
    }

    const layout = this._buildLayout(steps)
    const elementMap = new Map()

    const startEvents = steps.filter(step => step.type === 'startEvent')
    const endEvents = steps.filter(step => step.type === 'endEvent')
    const gatewaySteps = steps.filter(step => step.type === 'exclusiveGateway')
    const tasks = steps.filter(step => step.type === 'task' || step.type === 'subProcess')

    if (startEvents.length === 0 && steps.length > 0) {
      const first = steps[0]
      const firstPosition = layout.positions.get(first.id)
      const generatedId = `StartEvent_${first.id}`
      const generatedEvent = {
        id: generatedId,
        type: 'startEvent',
        name: 'Start',
        generated: true
      }
      startEvents.push(generatedEvent)
      layout.positions.set(generatedId, {
        x: (firstPosition?.x ?? 120) - 180,
        y: firstPosition?.y ?? 100,
        width: 36,
        height: 36
      })
    } else {
      startEvents.forEach(event => {
        const pos = layout.positions.get(event.id)
        if (!pos) {
          const reference = layout.positions.get(steps[0].id)
          layout.positions.set(event.id, {
            x: (reference?.x ?? 120) - 180,
            y: reference?.y ?? 100,
            width: 36,
            height: 36
          })
        }
      })
    }

    if (endEvents.length === 0 && steps.length > 0) {
      const last = steps[steps.length - 1]
      const lastPosition = layout.positions.get(last.id)
      const generatedId = `EndEvent_${last.id}`
      const generatedEvent = {
        id: generatedId,
        type: 'endEvent',
        name: 'End',
        generated: true
      }
      endEvents.push(generatedEvent)
      layout.positions.set(generatedId, {
        x: (lastPosition?.x ?? 120) + 180,
        y: lastPosition?.y ?? 100,
        width: 36,
        height: 36
      })
    }

    const processElements = []

    startEvents.forEach(event => {
      const elementId = event.generated ? event.id : `StartEvent_${event.id}`
      elementMap.set(event.id, elementId)
      processElements.push(`<bpmn:startEvent id="${elementId}" name="${this._escapeXml(event.name || 'Start')}" />`)
    })

    tasks.forEach(task => {
      const elementId = `Activity_${task.id}`
      elementMap.set(task.id, elementId)
      processElements.push(`<bpmn:task id="${elementId}" name="${this._escapeXml(task.name)}" />`)
    })

    gatewaySteps.forEach(gateway => {
      const elementId = `Gateway_${gateway.id}`
      elementMap.set(gateway.id, elementId)
      processElements.push(`<bpmn:exclusiveGateway id="${elementId}" name="${this._escapeXml(gateway.name)}" />`)
    })

    endEvents.forEach(event => {
      const elementId = event.generated ? event.id : `EndEvent_${event.id}`
      elementMap.set(event.id, elementId)
      processElements.push(`<bpmn:endEvent id="${elementId}" name="${this._escapeXml(event.name || 'End')}" />`)
    })

    const mergedFlows = this._mergeFlowsWithSynthetic(flows, startEvents, endEvents, elementMap, steps)
    const sequenceFlows = mergedFlows.map((flow, index) => ({
      ...flow,
      id: `Flow_${index + 1}`
    }))

    const sequences = sequenceFlows.map(flow => (
      `<bpmn:sequenceFlow id="${flow.id}" sourceRef="${flow.source}" targetRef="${flow.target}"${flow.label ? ` name="${this._escapeXml(flow.label)}"` : ''} />`
    ))

    const diagramShapes = []
    const diagramEdges = []

    layout.positions.forEach((position, id) => {
      const elementId = elementMap.get(id) || id
      const shapeId = `${elementId}_di`
      diagramShapes.push(
        `<bpmndi:BPMNShape id="${shapeId}" bpmnElement="${elementId}">
          <dc:Bounds x="${position.x}" y="${position.y}" width="${position.width}" height="${position.height}" />
        </bpmndi:BPMNShape>`
      )
    })

    sequenceFlows.forEach(flow => {
      const sourcePos = layout.positions.get(flow.sourceRef)
      const targetPos = layout.positions.get(flow.targetRef)

      const sourceCenter = this._centerPoint(sourcePos)
      const targetCenter = this._centerPoint(targetPos)

      diagramEdges.push(
        `<bpmndi:BPMNEdge id="${flow.id}_di" bpmnElement="${flow.id}">
          <di:waypoint x="${sourceCenter.x}" y="${sourceCenter.y}" />
          <di:waypoint x="${targetCenter.x}" y="${targetCenter.y}" />
        </bpmndi:BPMNEdge>`
      )
    })

    const processContent = [...processElements, ...sequences].join('\n        ')

    const diagramContent = `
      <bpmndi:BPMNDiagram id="BPMNDiagram_1">
        <bpmndi:BPMNPlane id="BPMNPlane_1" bpmnElement="Process_1">
          ${diagramShapes.join('\n          ')}
          ${diagramEdges.join('\n          ')}
        </bpmndi:BPMNPlane>
      </bpmndi:BPMNDiagram>
    `

    return `<?xml version="1.0" encoding="UTF-8"?>
<bpmn:definitions xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL" xmlns:bpmndi="http://www.omg.org/spec/BPMN/20100524/DI" xmlns:dc="http://www.omg.org/spec/DD/20100524/DC" xmlns:di="http://www.omg.org/spec/DD/20100524/DI" id="Definitions_1" targetNamespace="http://bpmn.io/schema/bpmn">
  <bpmn:process id="Process_1" isExecutable="false">
        ${processContent}
  </bpmn:process>
  ${diagramContent}
</bpmn:definitions>`
  }

  /**
   * Identify gateways (decision points) within the provided tickets.
   * @param {Array<Object>} tickets
   * @returns {Array<Object>} gateway descriptors
   */
  detectGateways(tickets = []) {
    if (!Array.isArray(tickets)) return []

    return tickets.reduce((acc, ticket, index) => {
      const text = this._concatTicketText(ticket)
      const matches = this.patterns.gatewayKeywords.filter(keyword => text.includes(keyword))

      if (matches.length === 0) {
        return acc
      }

      const conditions = this._extractConditionalClauses(text)

      acc.push({
        id: `Gateway_${ticket.id || index + 1}`,
        name: ticket.summary || ticket.id || `Decision ${index + 1}`,
        ticketId: ticket.id,
        ticketIndex: index,
        type: 'exclusiveGateway',
        keywords: matches,
        conditions
      })

      return acc
    }, [])
  }

  /**
   * Generate flow connections between workflow steps.
   * @param {Array<Object>} steps
   * @param {Array<Object>} gateways
   * @returns {Array<Object>} dependencies
   */
  mapDependencies(steps = [], gateways = []) {
    if (!Array.isArray(steps) || steps.length === 0) return []

    const dependencies = []

    for (let index = 0; index < steps.length - 1; index += 1) {
      const current = steps[index]
      const next = steps[index + 1]
      dependencies.push({
        id: `Dependency_${index + 1}`,
        from: current.id,
        to: next.id,
        type: 'sequence'
      })
    }

    gateways.forEach(gateway => {
      const gatewayStep = steps[gateway.ticketIndex]
      if (!gatewayStep) {
        return
      }

      const nextSteps = this._findNextSteps(steps, gateway.ticketIndex)

      nextSteps.forEach((target, branchIndex) => {
        dependencies.push({
          id: `GatewayDep_${gateway.ticketIndex}_${branchIndex}`,
          from: gatewayStep.id,
          to: target.id,
          type: 'gateway',
          label: gateway.conditions[branchIndex] || gateway.keywords[branchIndex] || 'Condition'
        })
      })
    })

    return this._dedupeDependencies(dependencies)
  }

  // ----------------------
  // Internal Helper Methods
  // ----------------------

  _buildStep(ticket, index, gateway = null, totalCount = 0) {
    const id = ticket.id || `Step_${index + 1}`
    const text = this._concatTicketText(ticket)
    const lowerText = text.toLowerCase()

    const isStart = index === 0 || this.patterns.eventKeywords.some(keyword => keyword === 'start' && lowerText.includes(keyword))
    const isEnd = index === (totalCount > 0 ? totalCount - 1 : -1) || this._hasEndKeyword(lowerText)
    const hasTaskKeyword = this.patterns.taskKeywords.some(keyword => lowerText.includes(keyword))

    let type = 'task'
    let category = 'activity'
    let name = ticket.summary || `Lépés ${index + 1}`

    if (gateway) {
      type = 'exclusiveGateway'
      category = 'gateway'
    } else if (isStart) {
      type = 'startEvent'
      category = 'event'
    } else if (isEnd) {
      type = 'endEvent'
      category = 'event'
    } else if (!hasTaskKeyword && this._looksLikeEvent(lowerText)) {
      type = 'intermediateThrowEvent'
      category = 'event'
    }

    return {
      id,
      ticketId: ticket.id,
      name,
      description: ticket.description || ticket.summary || '',
      assignee: ticket.assignee || 'Unassigned',
      type,
      category,
      index,
      metadata: {
        priority: ticket.priority || 'Medium',
        epic: ticket.epic || null,
        gateway: Boolean(gateway),
        gatewayKeywords: gateway?.keywords || [],
        acceptanceCriteria: ticket.acceptanceCriteria || [],
        isStart,
        isEnd
      }
    }
  }

  _concatTicketText(ticket = {}) {
    return [ticket.summary, ticket.description, Array.isArray(ticket.acceptanceCriteria) ? ticket.acceptanceCriteria.join(' ') : ticket.acceptanceCriteria]
      .filter(Boolean)
      .join(' ')
      .toLowerCase()
  }

  _hasEndKeyword(text) {
    return ['complete', 'completed', 'finished', 'deploy', 'deployed', 'close', 'closed', 'release', 'released', 'end'].some(keyword => text.includes(keyword))
  }

  _looksLikeEvent(text) {
    return this.patterns.eventKeywords.some(keyword => text.includes(keyword))
  }

  _extractConditionalClauses(text) {
    /* c8 ignore next 11 */
    const clauses = []
    const conditionalRegex = /(if|when|whenever|in case|unless)\s+([^.,;]+)/gi
    let match

    while ((match = conditionalRegex.exec(text)) !== null) {
      const clause = match[0]?.trim()
      if (clause) {
        clauses.push(clause)
      }
    }

    return clauses
  }

  _findNextSteps(steps, currentIndex) {
    /* c8 ignore next 20 */
    const nextSteps = []
    const current = steps[currentIndex]

    for (let index = currentIndex + 1; index < steps.length; index += 1) {
      const candidate = steps[index]
      if (candidate.metadata.gateway) {
        continue
      }
      nextSteps.push(candidate)
      if (candidate.type !== 'task') {
        break
      }
      if (nextSteps.length === 2) {
        break
      }
    }

    if (nextSteps.length === 0 && currentIndex + 1 < steps.length) {
      nextSteps.push(steps[currentIndex + 1])
    }

    return nextSteps
  }

  _dedupeDependencies(dependencies) {
    const seen = new Set()
    return dependencies.filter(dep => {
      const key = `${dep.from}->${dep.to}`
      if (seen.has(key)) {
        return false
      }
      seen.add(key)
      return true
    })
  }

  _buildSwimlanes(steps) {
    const lanes = new Map()

    steps.forEach(step => {
      const laneId = step.assignee || 'Unassigned'
      if (!lanes.has(laneId)) {
        lanes.set(laneId, {
          id: laneId,
          label: laneId,
          steps: []
        })
      }

      lanes.get(laneId).steps.push(step.id)
    })

    return Array.from(lanes.values())
  }

  _buildLayout(steps) {
    const positions = new Map()
    const widthMap = {
      startEvent: { width: 36, height: 36 },
      endEvent: { width: 36, height: 36 },
      exclusiveGateway: { width: 50, height: 50 },
      intermediateThrowEvent: { width: 36, height: 36 },
      task: { width: 120, height: 80 },
      subProcess: { width: 140, height: 100 }
    }

    const defaultSize = { width: 120, height: 80 }
    const lanePositions = new Map()
    const laneHeight = 150
    const xSpacing = 180
    const yStart = 100
    let maxLaneIndex = 0

    steps.forEach((step, index) => {
      const laneKey = step.assignee || 'Unassigned'
      if (!lanePositions.has(laneKey)) {
        lanePositions.set(laneKey, lanePositions.size)
      }

      const laneIndex = lanePositions.get(laneKey)
      maxLaneIndex = Math.max(maxLaneIndex, laneIndex)

      const size = widthMap[step.type] || defaultSize

      positions.set(step.id, {
        x: 120 + index * xSpacing,
        y: yStart + laneIndex * laneHeight,
        width: size.width,
        height: size.height
      })
    })

    return { positions, laneCount: maxLaneIndex + 1 }
  }

  _mergeFlowsWithSynthetic(flows, startEvents, endEvents, elementMap, steps) {
    const syntheticFlows = []
    const firstStep = steps[0]
    const lastStep = steps[steps.length - 1]

    const firstStart = startEvents[0]
    const lastEnd = endEvents[endEvents.length - 1]

    if (firstStart && firstStep) {
      syntheticFlows.push({
        source: elementMap.get(firstStart.id) || firstStart.id,
        target: elementMap.get(firstStep.id) || `Activity_${firstStep.id}`,
        label: 'Start',
        sourceRef: firstStart.id,
        targetRef: firstStep.id
      })
    }

    if (lastEnd && lastStep) {
      syntheticFlows.push({
        source: elementMap.get(lastStep.id) || `Activity_${lastStep.id}`,
        target: elementMap.get(lastEnd.id) || lastEnd.id,
        label: 'Complete',
        sourceRef: lastStep.id,
        targetRef: lastEnd.id
      })
    }

    const mappedFlows = flows.map(flow => ({
      source: elementMap.get(flow.from) || `Activity_${flow.from}`,
      target: elementMap.get(flow.to) || `Activity_${flow.to}`,
      label: flow.label,
      sourceRef: flow.from,
      targetRef: flow.to
    }))

    return [...mappedFlows, ...syntheticFlows]
  }

  _centerPoint(position) {
    if (!position) {
      return { x: 0, y: 0 }
    }
    return {
      x: position.x + position.width / 2,
      y: position.y + position.height / 2
    }
  }

  _escapeXml(value = '') {
    return String(value)
      .replace(/&/g, '&amp;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
  }

  _generateEmptyDiagram() {
    return `<?xml version="1.0" encoding="UTF-8"?>
<bpmn:definitions xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL" xmlns:bpmndi="http://www.omg.org/spec/BPMN/20100524/DI" xmlns:dc="http://www.omg.org/spec/DD/20100524/DC" xmlns:di="http://www.omg.org/spec/DD/20100524/DI" id="Definitions_Empty" targetNamespace="http://bpmn.io/schema/bpmn">
  <bpmn:process id="Process_Empty" isExecutable="false">
    <bpmn:startEvent id="StartEvent_Empty" name="Start" />
    <bpmn:endEvent id="EndEvent_Empty" name="End" />
  </bpmn:process>
  <bpmndi:BPMNDiagram id="BPMNDiagram_Empty">
    <bpmndi:BPMNPlane id="BPMNPlane_Empty" bpmnElement="Process_Empty">
      <bpmndi:BPMNShape id="StartEvent_Empty_di" bpmnElement="StartEvent_Empty">
        <dc:Bounds x="150" y="80" width="36" height="36" />
      </bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="EndEvent_Empty_di" bpmnElement="EndEvent_Empty">
        <dc:Bounds x="350" y="80" width="36" height="36" />
      </bpmndi:BPMNShape>
      <bpmndi:BPMNEdge id="Flow_Empty_di" bpmnElement="Flow_Empty">
        <di:waypoint x="168" y="98" />
        <di:waypoint x="368" y="98" />
      </bpmndi:BPMNEdge>
    </bpmndi:BPMNPlane>
  </bpmndi:BPMNDiagram>
</bpmn:definitions>`
  }
}

const bpmnService = new BPMNService()

export { BPMNService }
export default bpmnService

