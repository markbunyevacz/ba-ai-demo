import PropTypes from 'prop-types'
import fs from 'fs'
import os from 'os'
import path from 'path'

const downloadBlob = (content, filename, mimeType) => {
  const blob = new Blob([content], { type: mimeType })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

const DiagramExport = ({ diagram }) => {
  if (!diagram) {
    return (
      <div className="p-6 text-sm text-slate-500 bg-slate-50 border border-dashed border-slate-200 rounded-lg">
        Nincs exportálható diagram.
      </div>
    )
  }

  const handleExport = (format) => {
    if (format === 'svg' && diagram.svg) {
      downloadBlob(diagram.svg, `${diagram.id}.svg`, 'image/svg+xml')
    }
    if (format === 'png' && diagram.png) {
      const link = document.createElement('a')
      link.href = diagram.png.startsWith('data:') ? diagram.png : `data:image/png;base64,${diagram.png}`
      link.download = `${diagram.id}.png`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    }
    if (format === 'xml' && diagram.xml) {
      downloadBlob(diagram.xml, `${diagram.id}.xml`, 'application/xml')
    }
    if (format === 'definition' && diagram.definition) {
      downloadBlob(diagram.definition, `${diagram.id}.mmd`, 'text/plain')
    }
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <ExportCard
          title="SVG letöltése"
          description="Vektoros formátum diagram szerkesztők számára"
          disabled={!diagram.svg}
          onClick={() => handleExport('svg')}
        />
        <ExportCard
          title="PNG letöltése"
          description="Pixel alapú export prezentációkhoz"
          disabled={!diagram.png}
          onClick={() => handleExport('png')}
        />
        <ExportCard
          title="BPMN XML"
          description="Szabványos BPMN 2.0 XML export"
          disabled={!diagram.xml}
          onClick={() => handleExport('xml')}
        />
        <ExportCard
          title="Mermaid definíció"
          description="Szerkeszthető Mermaid forrás"
          disabled={!diagram.definition}
          onClick={() => handleExport('definition')}
        />
      </div>

      <div className="text-xs text-slate-500 bg-slate-50 border border-slate-200 rounded-lg p-4">
        <h4 className="font-semibold text-slate-600 mb-2">Metaadatok</h4>
        <dl className="grid grid-cols-2 gap-2">
          <MetaField label="Azonosító" value={diagram.id} />
          <MetaField label="Típus" value={diagram.type?.toUpperCase() || 'Ismeretlen'} />
          <MetaField label="Ticketek száma" value={diagram.metadata?.tickets ?? '-'} />
          <MetaField
            label="Generálva"
            value={diagram.metadata?.generatedAt ? new Date(diagram.metadata.generatedAt).toLocaleString() : '-'}
          />
          <MetaField label="Forrás" value={diagram.metadata?.workforce?.source || diagram.metadata?.source || '-'} />
        </dl>
      </div>
    </div>
  )
}

const ExportCard = ({ title, description, disabled, onClick }) => (
  <button
    type="button"
    onClick={onClick}
    disabled={disabled}
    className={`text-left p-4 border rounded-lg transition shadow-sm ${
      disabled
        ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
        : 'bg-white hover:border-indigo-200 hover:shadow-md'
    }`}
  >
    <h5 className="text-sm font-semibold text-slate-700">{title}</h5>
    <p className="text-xs text-slate-500 mt-1">{description}</p>
    {!disabled && (
      <span className="inline-block mt-2 text-xs text-indigo-600 font-medium">Letöltés</span>
    )}
  </button>
)

ExportCard.propTypes = {
  title: PropTypes.string.isRequired,
  description: PropTypes.string.isRequired,
  disabled: PropTypes.bool,
  onClick: PropTypes.func.isRequired
}

ExportCard.defaultProps = {
  disabled: false
}

const MetaField = ({ label, value }) => (
  <div>
    <dt className="text-[10px] uppercase tracking-wide text-slate-400">{label}</dt>
    <dd className="text-xs text-slate-600 mt-1">{value ?? '-'}</dd>
  </div>
)

MetaField.propTypes = {
  label: PropTypes.string.isRequired,
  value: PropTypes.oneOfType([
    PropTypes.string,
    PropTypes.number,
    PropTypes.node
  ])
}

MetaField.defaultProps = {
  value: '-'
}

DiagramExport.propTypes = {
  diagram: PropTypes.shape({
    id: PropTypes.string.isRequired,
    type: PropTypes.string,
    svg: PropTypes.string,
    png: PropTypes.string,
    xml: PropTypes.string,
    definition: PropTypes.string,
    metadata: PropTypes.object
  })
}

DiagramExport.defaultProps = {
  diagram: null
}

export default DiagramExport

