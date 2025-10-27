import { useEffect, useState } from 'react'
import PropTypes from 'prop-types'
import diagramClient from '../services/diagramClient.js'

export const normalizeDefinition = (value) => {
  if (!value) return ''
  return value.replace(/\s+/g, ' ').trim()
}

export const hasDefinitionChanged = (a, b) => normalizeDefinition(a) !== normalizeDefinition(b)

const DiagramEditor = ({ initialDefinition, onRegenerate }) => {
  const [definition, setDefinition] = useState(initialDefinition)
  const [svgPreview, setSvgPreview] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!initialDefinition) {
      setSvgPreview(null)
      return
    }

    if (hasDefinitionChanged(definition, initialDefinition)) {
      setDefinition(initialDefinition)
      void generateSvg(initialDefinition)
    }
  }, [initialDefinition])

  const generateSvg = async (value = definition) => {
    const normalized = normalizeDefinition(value)
    if (!normalized) {
      setSvgPreview(null)
      setError(null)
      return
    }

    setLoading(true)
    setError(null)
    try {
      const diagram = await diagramClient.renderDefinition(normalized, ['svg'])
      setSvgPreview(diagram.svg)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (definition) {
      void generateSvg(definition)
    }
  }, [definition])

  const handleRegenerate = async () => {
    if (!onRegenerate) return
    try {
      const regenerated = await onRegenerate(definition)
      if (regenerated?.definition && hasDefinitionChanged(regenerated.definition, definition)) {
        setDefinition(regenerated.definition)
      }
    } catch (err) {
      setError(err.message)
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <textarea
        className="w-full p-4 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        rows="20"
        value={definition}
        onChange={(e) => setDefinition(e.target.value)}
        placeholder="Mermaid definition (e.g., graph TD, A --> B, A --> C)"
      />
      <div className="flex gap-2">
        <button
          onClick={() => generateSvg(definition)}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          disabled={loading}
        >
          {loading ? 'Generálás...' : 'Előnézet frissítése'}
        </button>
        {onRegenerate && (
          <button
            onClick={handleRegenerate}
            className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2"
            disabled={loading}
          >
            BPMN újragenerálása
          </button>
        )}
      </div>
      {error && <p className="text-red-500 text-sm">{error}</p>}
      {svgPreview && (
        <div className="mt-6 border border-slate-200 rounded-lg bg-white">
          <div className="px-4 py-2 border-b border-slate-200 flex items-center justify-between">
            <h4 className="text-xs font-semibold text-slate-600">Generált előnézet</h4>
            <span className="text-[10px] text-slate-400">Ez egy automatikus frissítés, mentés nélkül</span>
          </div>
          <div className="diagram-preview" dangerouslySetInnerHTML={{ __html: svgPreview }} />
        </div>
      )}
    </div>
  )
}

DiagramEditor.propTypes = {
  initialDefinition: PropTypes.string,
  onRegenerate: PropTypes.func
}

DiagramEditor.defaultProps = {
  initialDefinition: '',
  onRegenerate: undefined
}

export default DiagramEditor
