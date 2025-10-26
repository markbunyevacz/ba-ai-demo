import { useEffect, useRef, useState } from 'react'
import PropTypes from 'prop-types'
import BpmnViewer from 'bpmn-js/lib/Viewer'
import BpmnModeler from 'bpmn-js/lib/Modeler'

/**
 * BPMN Viewer Component
 * Renders BPMN diagrams using bpmn-js and provides interactive editing capabilities.
 * Supports zoom, reset, toggle between view/edit, and export to BPMN XML.
 */
const BPMNViewer = ({ xml, allowEditing = false, onExport, onError }) => {
  const containerRef = useRef(null)
  const viewerRef = useRef(null)
  const [mode, setMode] = useState(allowEditing ? 'edit' : 'view')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    const initializeViewer = async () => {
      if (!containerRef.current) return

      setLoading(true)
      setError('')

      try {
        if (viewerRef.current) {
          viewerRef.current.destroy()
          viewerRef.current = null
        }

        const ViewerClass = mode === 'edit' ? BpmnModeler : BpmnViewer
        viewerRef.current = new ViewerClass({
          container: containerRef.current,
          keyboard: { bindTo: document },
          height: '100%',
          additionalModules: []
        })

        if (xml) {
          await viewerRef.current.importXML(xml)
          const canvas = viewerRef.current.get('canvas')
          canvas.zoom('fit-viewport', 'auto')
        }
      } catch (err) {
        const errorMessage = `Nem sikerült betölteni a BPMN diagramot: ${err.message}`
        setError(errorMessage)
        onError?.(errorMessage)
      } finally {
        setLoading(false)
      }
    }

    initializeViewer()

    return () => {
      if (viewerRef.current) {
        viewerRef.current.destroy()
        viewerRef.current = null
      }
    }
  }, [xml, mode])

  const handleZoomIn = () => {
    const canvas = viewerRef.current?.get('canvas')
    if (canvas) {
      canvas.zoom(canvas.zoom() + 0.2)
    }
  }

  const handleZoomOut = () => {
    const canvas = viewerRef.current?.get('canvas')
    if (canvas) {
      canvas.zoom(Math.max(0.2, canvas.zoom() - 0.2))
    }
  }

  const handleResetZoom = () => {
    const canvas = viewerRef.current?.get('canvas')
    if (canvas) {
      canvas.zoom('fit-viewport', 'auto')
    }
  }

  const handleToggleMode = () => {
    if (!allowEditing) return
    setMode(prev => (prev === 'view' ? 'edit' : 'view'))
  }

  const handleExport = async (format = 'bpmn') => {
    if (!viewerRef.current) return

    try {
      const result = await viewerRef.current.saveXML({ format: true })

      if (format === 'bpmn' || format === 'xml') {
        const blob = new Blob([result.xml], { type: 'application/xml' })
        const url = window.URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.href = url
        link.download = `workflow-diagram.${format}`
        document.body.appendChild(link)
        link.click()
        link.remove()
        window.URL.revokeObjectURL(url)
        onExport?.(result.xml)
      }
    } catch (err) {
      const errorMessage = `Nem sikerült exportálni a BPMN diagramot: ${err.message}`
      setError(errorMessage)
      onError?.(errorMessage)
    }
  }

  return (
    <div className="w-full h-full bg-white rounded-lg border border-slate-200 shadow-sm">
      <div className="flex items-center justify-between px-4 py-2 border-b border-slate-200 bg-slate-50 rounded-t-lg">
        <div className="flex items-center space-x-2">
          <h3 className="text-sm font-semibold text-slate-700">BPMN Folyamat Diagram</h3>
          {allowEditing && (
            <span className="text-xs bg-indigo-100 text-indigo-700 px-2 py-1 rounded-full font-medium">
              {mode === 'edit' ? 'Szerkesztés' : 'Megtekintés'}
            </span>
          )}
        </div>
        <div className="flex items-center space-x-2">
          <button
            type="button"
            onClick={handleZoomOut}
            className="px-2 py-1 text-sm bg-slate-100 hover:bg-slate-200 rounded transition"
          >
            -
          </button>
          <button
            type="button"
            onClick={handleResetZoom}
            className="px-2 py-1 text-sm bg-slate-100 hover:bg-slate-200 rounded transition"
          >
            100%
          </button>
          <button
            type="button"
            onClick={handleZoomIn}
            className="px-2 py-1 text-sm bg-slate-100 hover:bg-slate-200 rounded transition"
          >
            +
          </button>
          {allowEditing && (
            <button
              type="button"
              onClick={handleToggleMode}
              className="px-3 py-1 text-sm bg-indigo-600 hover:bg-indigo-700 text-white rounded transition"
            >
              {mode === 'edit' ? 'Megtekintés mód' : 'Szerkesztés mód'}
            </button>
          )}
          <button
            type="button"
            onClick={() => handleExport('bpmn')}
            className="px-3 py-1 text-sm bg-emerald-600 hover:bg-emerald-700 text-white rounded transition"
          >
            Export .bpmn
          </button>
          <button
            type="button"
            onClick={() => handleExport('xml')}
            className="px-3 py-1 text-sm bg-emerald-100 hover:bg-emerald-200 text-emerald-700 rounded transition"
          >
            Export .xml
          </button>
        </div>
      </div>

      {error && (
        <div className="px-4 py-3 bg-red-50 text-red-700 text-sm border-b border-red-200">
          {error}
        </div>
      )}

      <div className="relative" style={{ height: '500px' }}>
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-white bg-opacity-70 z-10">
            <span className="text-sm text-slate-600">Diagram betöltése...</span>
          </div>
        )}
        <div ref={containerRef} className="w-full h-full" />
      </div>
    </div>
  )
}

BPMNViewer.propTypes = {
  xml: PropTypes.string.isRequired,
  allowEditing: PropTypes.bool,
  onExport: PropTypes.func,
  onError: PropTypes.func
}

export default BPMNViewer

