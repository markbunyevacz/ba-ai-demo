import { randomUUID } from 'node:crypto'
import kebabCase from 'just-kebab-case'
import { diagramSources } from './diagramSources.js'
import bpmnService from './bpmnService.js'

const SUPPORTED_FORMATS = ['png', 'svg', 'xml']

class DiagramService {
  constructor() {
    this.sources = diagramSources
  }

  async generateFromTickets(tickets = [], options = {}) {
    const {
      type = 'bpmn',
      formats = ['svg'],
      diagramId = `diagram_${randomUUID()}`,
      workforceMetadata = {}
    } = options

    if (!Array.isArray(tickets)) {
      throw new Error('Tickets must be provided as an array for diagram generation')
    }

    const normalizedFormats = this.normalizeFormats(formats)

    const context = {
      diagramId,
      generatedAt: new Date().toISOString(),
      tickets: tickets.length,
      workforce: workforceMetadata
    }

    if (type === 'bpmn') {
      return this.generateBpmnDiagram(tickets, normalizedFormats, context)
    }

    if (type === 'uml' || type === 'mermaid') {
      return this.generateMermaidDiagram(tickets, normalizedFormats, context)
    }

    throw new Error(`Unsupported diagram type: ${type}`)
  }

  normalizeFormats(formats = []) {
    const requested = Array.isArray(formats) ? formats : [formats]
    const unique = new Set(
      requested
        .map(format => String(format).toLowerCase())
        .filter(format => SUPPORTED_FORMATS.includes(format))
    )

    if (unique.size === 0) {
      unique.add('svg')
    }

    return Array.from(unique)
  }

  async generateBpmnDiagram(tickets, formats, context) {
    const workflow = bpmnService.analyzeWorkflow(tickets)
    const xml = bpmnService.generateBPMNXML(workflow)

    const outputs = {
      type: 'bpmn',
      id: context.diagramId,
      xml,
      workflow,
      metadata: context,
      definition: this.buildMermaidDefinition(tickets, workflow)
    }

    if (formats.includes('svg') || formats.includes('png')) {
      outputs.svg = await this.renderMermaidSvg(outputs.definition, { diagramId: `${context.diagramId}_workflow` })
    }

    if (formats.includes('png') && outputs.svg) {
      outputs.png = await this.renderPng(outputs.svg)
    }

    if (!formats.includes('xml')) {
      delete outputs.xml
    }

    return outputs
  }

  async generateMermaidDiagram(tickets, formats, context) {
    const workflow = bpmnService.analyzeWorkflow(tickets)
    const definition = this.buildMermaidDefinition(tickets, workflow)
    const svg = await this.renderMermaidSvg(definition, { diagramId: `${context.diagramId}_uml` })

    const outputs = {
      type: 'mermaid',
      id: context.diagramId,
      definition,
      svg,
      metadata: {
        ...context,
        syntax: 'mermaid'
      }
    }

    if (formats.includes('png')) {
      outputs.png = await this.renderPng(svg)
    }

    if (formats.includes('xml')) {
      outputs.xml = svg
    }

    return outputs
  }

  async renderDefinition(definition, formats = ['svg'], options = {}) {
    if (!definition || typeof definition !== 'string') {
      throw new Error('Mermaid definition is required for rendering')
    }

    const normalizedFormats = this.normalizeFormats(formats)
    const diagramId = options.diagramId || `definition_${randomUUID()}`

    const svg = await this.renderMermaidSvg(definition, { diagramId })

    const result = {
      type: 'mermaid',
      id: diagramId,
      definition,
      svg,
      metadata: {
        generatedAt: new Date().toISOString(),
        source: options.source || 'custom-definition'
      }
    }

    if (normalizedFormats.includes('png')) {
      result.png = await this.renderPng(svg)
    }

    if (normalizedFormats.includes('xml')) {
      result.xml = definition
    }

    return result
  }

  buildMermaidDefinition(tickets, workflow = null) {
    if (!tickets.length) {
      return 'graph TD\n  Start[Start] --> End[End]'
    }

    const workflowData = workflow || bpmnService.analyzeWorkflow(tickets)
    const steps = workflowData.steps || []
    const dependencies = workflowData.dependencies || []

    const nodes = []
    const edges = []
    const classes = []
    const idMap = new Map()

    steps.forEach((step, index) => {
      const identifier = step.id || tickets[index]?.id || `Step${index + 1}`
      const nodeId = this.sanitizeId(identifier)
      const label = this.formatNodeLabel(step.name || identifier)
      idMap.set(identifier, nodeId)

      const nodeLabel = step.metadata?.gateway ? `${label}?` : label
      nodes.push(`${nodeId}[${nodeLabel}]`)

      if (step.metadata?.isStart) {
        classes.push(`${nodeId}:::start`)
      } else if (step.metadata?.isEnd) {
        classes.push(`${nodeId}:::end`)
      } else if (step.metadata?.gateway) {
        classes.push(`${nodeId}:::gateway`)
      } else {
        classes.push(`${nodeId}:::task`)
      }
    })

    dependencies
      .filter(dep => dep?.from && dep?.to)
      .forEach(dep => {
        const source = idMap.get(dep.from) || this.sanitizeId(dep.from)
        const target = idMap.get(dep.to) || this.sanitizeId(dep.to)

        if (!source || !target) {
          return
        }

        const label = dep.label ? `|${this.formatEdgeLabel(dep.label)}|` : ''
        edges.push(`${source} -->${label} ${target}`)
      })

    const swimlaneMeta = (workflowData.swimlanes || [])
      .map(lane => `%% Swimlane: ${lane.label || lane.id} -> ${lane.steps.map(stepId => idMap.get(stepId) || this.sanitizeId(stepId)).join(', ')}`)

    const definitionParts = [
      'graph TD',
      ...nodes.map(line => `  ${line}`),
      ...edges.map(line => `  ${line}`),
      ...classes.map(line => `  ${line}`),
      ...swimlaneMeta.map(line => `  ${line}`),
      '  classDef start fill:#10b981,stroke:#047857,color:#fff,stroke-width:2px;',
      '  classDef end fill:#ef4444,stroke:#b91c1c,color:#fff,stroke-width:2px;',
      '  classDef gateway fill:#fbbf24,stroke:#b45309,color:#78350f,stroke-width:2px;',
      '  classDef task fill:#f8fafc,stroke:#94a3b8,color:#1e293b;'
    ]

    return definitionParts.join('\n')
  }

  sanitizeId(value) {
    const base = String(value || '')
      .replace(/[^a-zA-Z0-9_]/g, '_')
      .replace(/_+/g, '_')
      .replace(/^_+|_+$/g, '')

    if (!base) {
      return `node_${kebabCase(randomUUID())}`
    }

    return base
  }

  formatNodeLabel(label) {
    return String(label)
      .replace(/\r?\n/g, ' ')
      .slice(0, 80)
  }

  formatEdgeLabel(label) {
    return String(label)
      .replace(/\r?\n/g, ' ')
      .replace(/\s+/g, ' ')
      .slice(0, 40)
  }

  async renderMermaidSvg(definition, options = {}) {
    const renderer = await diagramSources.mermaid
    return renderer.render(definition, options)
  }

  async renderPng(svgContent) {
    if (!svgContent) {
      throw new Error('SVG content required for PNG rendering')
    }

    const rasterizer = await diagramSources.rasterizer
    return rasterizer.svgToPng(svgContent)
  }
}

const diagramService = new DiagramService()

export { DiagramService }
export default diagramService

