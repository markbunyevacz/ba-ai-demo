import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, act } from '@testing-library/react'
import BPMNViewer from '../BPMNViewer'

const createMockCanvas = () => ({
  zoom: vi.fn()
})

afterEach(() => {
  vi.clearAllMocks()
})

vi.mock('bpmn-js/lib/Viewer', () => {
  return {
    default: class MockViewer {
      constructor() {}

      async importXML() {
        return Promise.resolve()
      }

      get() {
        return createMockCanvas()
      }

      destroy() {}
    }
  }
})

vi.mock('bpmn-js/lib/Modeler', () => {
  return {
    default: class MockModeler {
      constructor() {}

      async importXML() {
        return Promise.resolve()
      }

      get() {
        return createMockCanvas()
      }

      destroy() {}

      async saveXML() {
        return { xml: '<definitions />' }
      }
    }
  }
})

describe('BPMNViewer', () => {
  const sampleXml = `<?xml version="1.0" encoding="UTF-8"?>
  <definitions xmlns="http://www.omg.org/spec/BPMN/20100524/MODEL"></definitions>`

  it('renders without errors in view mode', async () => {
    await act(async () => {
      render(<BPMNViewer xml={sampleXml} />)
    })
    expect(screen.getByText('BPMN Folyamat Diagram')).toBeInTheDocument()
  })

  it('displays edit badge when editing is allowed', async () => {
    await act(async () => {
      render(<BPMNViewer xml={sampleXml} allowEditing />)
    })
    expect(screen.getByText('Szerkesztés')).toBeInTheDocument()
  })
})

