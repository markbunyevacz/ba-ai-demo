import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render as rtlRender, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

const mocks = vi.hoisted(() => ({
  viewInstances: [],
  editInstances: [],
  forceViewerImportError: false
}))

vi.mock('bpmn-js/lib/Viewer', () => {
  class MockViewer {
    constructor() {
      this.zoomMock = vi.fn()
      this.importXML = mocks.forceViewerImportError
        ? vi.fn().mockRejectedValue(new Error('boom'))
        : vi.fn().mockResolvedValue(undefined)
      if (mocks.forceViewerImportError) {
        mocks.forceViewerImportError = false
      }
      this.get = vi.fn(service => (service === 'canvas' ? { zoom: this.zoomMock } : null))
      this.saveXML = vi.fn().mockResolvedValue({ xml: '<xml />' })
      this.destroy = vi.fn()
      mocks.viewInstances.push(this)
    }
  }
  return { __esModule: true, default: MockViewer }
})

vi.mock('bpmn-js/lib/Modeler', () => {
  class MockModeler {
    constructor() {
      this.zoomMock = vi.fn()
      this.importXML = vi.fn().mockResolvedValue(undefined)
      this.get = vi.fn(service => (service === 'canvas' ? { zoom: this.zoomMock } : null))
      this.saveXML = vi.fn().mockResolvedValue({ xml: '<xml />' })
      this.destroy = vi.fn()
      mocks.editInstances.push(this)
    }
  }
  return { __esModule: true, default: MockModeler }
})

const sampleXml = '<definitions />'

const customRender = (ui, options = {}) => {
  const container = document.createElement('div')
  document.body.appendChild(container)
  const result = rtlRender(ui, { container, ...options })
  return {
    ...result,
    unmount: () => {
      result.unmount()
      container.remove()
    }
  }
}

import BPMNViewer from '../BPMNViewer.jsx'

describe('BPMNViewer', () => {
  let createObjectURLMock
  let revokeObjectURLMock

  beforeEach(() => {
    createObjectURLMock = vi.spyOn(window.URL, 'createObjectURL').mockReturnValue('blob:mock')
    revokeObjectURLMock = vi.spyOn(window.URL, 'revokeObjectURL').mockImplementation(() => {})
    mocks.viewInstances.length = 0
    mocks.editInstances.length = 0
    mocks.forceViewerImportError = false
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('initializes viewer in view mode and fits diagram', async () => {
    customRender(<BPMNViewer xml={sampleXml} />)

    await waitFor(() => {
      expect(mocks.viewInstances[0].importXML).toHaveBeenCalledWith(sampleXml)
    })

    const canvas = mocks.viewInstances[0].get.mock.results[0].value
    expect(canvas.zoom).toHaveBeenCalledWith('fit-viewport', 'auto')
  })

  it('toggles to edit mode and cleans up on unmount', async () => {
    const { unmount } = customRender(<BPMNViewer xml={sampleXml} allowEditing />)

    await waitFor(() => {
      expect(mocks.editInstances[0].importXML).toHaveBeenCalledWith(sampleXml)
    })

    await userEvent.click(screen.getByRole('button', { name: 'Megtekintés mód' }))

    await waitFor(() => mocks.viewInstances.length > 1)
    await waitFor(() => {
      expect(mocks.viewInstances.at(-1).importXML).toHaveBeenCalledWith(sampleXml)
    })

    unmount()
    expect(mocks.viewInstances.at(-1).destroy).toHaveBeenCalled()
  })

  it('handles zoom controls', async () => {
    customRender(<BPMNViewer xml={sampleXml} allowEditing />)

    await waitFor(() => mocks.editInstances[0].importXML.mock.calls.length)

    await userEvent.click(screen.getByRole('button', { name: '-' }))
    await userEvent.click(screen.getByRole('button', { name: '+' }))
    await userEvent.click(screen.getByRole('button', { name: '100%' }))

    const canvas = mocks.editInstances[0].get.mock.results.at(-1).value
    expect(canvas.zoom).toHaveBeenCalled()
  })

  it('exports diagram in BPMN format', async () => {
    const onExport = vi.fn()
    customRender(<BPMNViewer xml={sampleXml} allowEditing onExport={onExport} />)

    await waitFor(() => mocks.editInstances[0].importXML.mock.calls.length)

    await userEvent.click(screen.getByRole('button', { name: 'Export .bpmn' }))

    await waitFor(() => {
      expect(mocks.editInstances[0].saveXML).toHaveBeenCalledWith({ format: true })
    })

    expect(onExport).toHaveBeenCalledWith('<xml />')
    expect(createObjectURLMock).toHaveBeenCalled()
    expect(revokeObjectURLMock).toHaveBeenCalled()
  })

  it('renders error message when import fails', async () => {
    mocks.forceViewerImportError = true

    const onError = vi.fn()
    customRender(<BPMNViewer xml={sampleXml} onError={onError} />)

    await waitFor(() => {
      expect(onError).toHaveBeenCalled()
    })

    expect(screen.getByText(/Nem sikerült betölteni a BPMN diagramot/)).toBeInTheDocument()
  })
})

