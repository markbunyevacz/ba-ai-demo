import { useEffect, useMemo, useState } from 'react'
import PropTypes from 'prop-types'
import DiagramEditor from './DiagramEditor.jsx'
import DiagramExport from './DiagramExport.jsx'
import diagramClient from '../services/diagramClient.js'

const TAB_OPTIONS = ['preview', 'editor', 'export']

const DiagramViewer = ({ diagram, onRefresh }) => {
  const [activeTab, setActiveTab] = useState('preview')
  const [renderError, setRenderError] = useState('')
  const [currentDiagram, setCurrentDiagram] = useState(diagram)

  useEffect(() => {
    setRenderError('')
    setActiveTab('preview')
    setCurrentDiagram(diagram)
  }, [diagram])

  const svgContent = useMemo(() => {
    if (!currentDiagram?.svg) return ''
    try {
      return currentDiagram.svg
    } catch (error) {
      setRenderError(error.message)
      return ''
    }
  }, [currentDiagram])

  const handleDefinitionUpdate = async (definition) => {
    if (!currentDiagram) return null

    try {
      const updated = await diagramClient.renderDefinition(definition, ['svg', 'png', 'xml'])
      const mergedDiagram = {
        ...currentDiagram,
        ...updated,
        definition
      }
      setCurrentDiagram(mergedDiagram)
      if (typeof onRefresh === 'function') {
        onRefresh(mergedDiagram)
      }
      return mergedDiagram
    } catch (error) {
      setRenderError(error.message)
      return null
    }
  }

  if (!currentDiagram) {
    return (
      <div className="p-6 text-sm text-slate-500 bg-slate-50 border border-dashed border-slate-200 rounded-lg">
        Nincs megjeleníthető diagram.
      </div>
    )
  }

  return (
    <div className="bg-white border border-slate-200 rounded-lg shadow-sm">
      <div className="flex justify-between items-center px-4 py-3 border-b border-slate-200">
        <div>
          <h3 className="text-sm font-semibold text-slate-700">Modellezési munkapad</h3>
          <p className="text-xs text-slate-500">Diagram az elfogadási kritériumok és ticket leírások alapján</p>
        </div>
        <div className="flex items-center space-x-2 text-xs text-slate-500">
          <span>ID: {currentDiagram.id}</span>
          <span>•</span>
          <span>{currentDiagram.metadata?.generatedAt ? new Date(currentDiagram.metadata.generatedAt).toLocaleString() : 'Ismeretlen idő'}</span>
          {currentDiagram.metadata?.tickets !== undefined && (
            <>
              <span>•</span>
              <span>{currentDiagram.metadata.tickets} ticket</span>
            </>
          )}
        </div>
      </div>

      <div className="flex gap-2 px-4 pt-4 border-b border-slate-100 bg-slate-50">
        {TAB_OPTIONS.map(tab => (
          <button
            key={tab}
            type="button"
            onClick={() => setActiveTab(tab)}
            className={`px-3 py-2 text-xs font-medium rounded-t-md transition ${activeTab === tab ? 'bg-white text-indigo-600 border border-b-0 border-slate-200' : 'text-slate-500 hover:text-slate-600'}`}
          >
            {tab === 'preview' && 'Előnézet'}
            {tab === 'editor' && 'Szerkesztő'}
            {tab === 'export' && 'Export'}
          </button>
        ))}
      </div>

      <div className="p-4">
        {renderError && (
          <div className="mb-4 p-3 text-xs bg-red-50 border border-red-200 text-red-600 rounded">
            {renderError}
          </div>
        )}

        {activeTab === 'preview' && (
          <div className="border border-slate-200 rounded-lg overflow-hidden bg-white">
            {svgContent ? (
              <div className="relative">
                <div className="absolute top-3 right-3 text-xs bg-indigo-100 text-indigo-700 px-2 py-1 rounded-full">
                  {currentDiagram.type?.toUpperCase() || 'BPMN'}
                </div>
                <div className="diagram-preview" dangerouslySetInnerHTML={{ __html: svgContent }} />
              </div>
            ) : (
              <div className="p-10 text-center text-sm text-slate-500">
                Nincs SVG tartalom a diagramhoz.
              </div>
            )}
          </div>
        )}

        {activeTab === 'editor' && (
          <DiagramEditor
            initialDefinition={currentDiagram.definition}
            onRegenerate={handleDefinitionUpdate}
          />
        )}

        {activeTab === 'export' && (
          <DiagramExport diagram={currentDiagram} />
        )}
      </div>
    </div>
  )
}

DiagramViewer.propTypes = {
  diagram: PropTypes.shape({
    id: PropTypes.string.isRequired,
    type: PropTypes.string,
    svg: PropTypes.string,
    xml: PropTypes.string,
    definition: PropTypes.string,
    workflow: PropTypes.object,
    metadata: PropTypes.object
  }),
  onRefresh: PropTypes.func
}

DiagramViewer.defaultProps = {
  diagram: null,
  onRefresh: undefined
}

export default DiagramViewer

