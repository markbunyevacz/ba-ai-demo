import PropTypes from 'prop-types'

const DocumentPreview = ({ preview }) => {
  if (!preview) {
    return null
  }

  if (preview.type === 'excel') {
    const {
      headers = [],
      rowSamples = [],
      sampleCount = 0,
      totalRows = 0,
      totalColumns = 0,
      detectedColumns = [],
      emptyCellRatio = 0
    } = preview

    return (
      <div className="bg-white border-2 border-slate-200 rounded-xl p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold text-slate-800">Excel előnézet</h3>
            <p className="text-sm text-slate-500">Strukturált táblázat információk</p>
          </div>
          <div className="text-right text-sm text-slate-500">
            <div>{totalRows} sor összesen</div>
            <div>{totalColumns} oszlop</div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Felismerett oszlopok</p>
            <div className="flex flex-wrap gap-2">
              {detectedColumns.length > 0 ? detectedColumns.map(column => (
                <span key={column} className="px-3 py-1 bg-blue-50 text-blue-700 border border-blue-100 rounded-full text-xs font-medium">
                  {column}
                </span>
              )) : (
                <span className="text-xs text-slate-400">Nem talált felismerhető oszlopot</span>
              )}
            </div>
          </div>

          <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Adat minőség</p>
            <p className="text-sm text-slate-600">Üres cellák aránya: {(emptyCellRatio * 100).toFixed(1)}%</p>
            {sampleCount > 0 && <p className="text-sm text-slate-600">Előnézet sorok: {sampleCount}</p>}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-100">
              <tr>
                {headers.map((header, index) => (
                  <th key={`${header}-${index}`} className="px-3 py-2 text-left text-xs font-semibold text-slate-600 uppercase tracking-wide">
                    {header || `Oszlop ${index + 1}`}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-slate-200">
              {rowSamples.map((row, rowIndex) => (
                <tr key={rowIndex} className="hover:bg-slate-50">
                  {row.map((cell, cellIndex) => (
                    <td key={cellIndex} className="px-3 py-2 text-xs text-slate-700 whitespace-nowrap max-w-[200px] truncate" title={cell}>
                      {cell || <span className="text-slate-400">(üres)</span>}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {totalRows > sampleCount && (
          <p className="text-xs text-slate-400 mt-3">+ még {totalRows - sampleCount} sor…</p>
        )}
      </div>
    )
  }

  const { type, headings = [], paragraphs = [], paragraphCount = 0, wordCount = 0, listHighlights = [] } = preview

  return (
    <div className="bg-white border-2 border-slate-200 rounded-xl p-6 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-slate-800">Dokumentum előnézet</h3>
          <p className="text-sm text-slate-500">Gyors áttekintés a feldolgozott tartalomról ({type === 'word' ? 'Word' : 'Excel'})</p>
        </div>
        <div className="text-right text-sm text-slate-500">
          <div>{wordCount} szó</div>
          <div>{paragraphCount} bekezdés</div>
        </div>
      </div>

      {headings.length > 0 && (
        <div className="mb-6">
          <h4 className="text-sm font-semibold text-slate-700 uppercase tracking-wide mb-2">Fő fejezetek</h4>
          <ul className="space-y-2">
            {headings.map((heading, index) => (
              <li key={`${heading.text}-${index}`} className="flex items-start gap-2">
                <span className="text-blue-600 font-semibold">{heading.level || 'H'}{heading.level ? '' : index + 1}.</span>
                <span className="text-slate-700">{heading.text}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {paragraphs.length > 0 && (
        <div className="mb-6">
          <h4 className="text-sm font-semibold text-slate-700 uppercase tracking-wide mb-2">Bekezdések</h4>
          <div className="space-y-3">
            {paragraphs.map((paragraph, index) => (
              <p key={index} className="text-sm text-slate-600 leading-relaxed bg-slate-50 border border-slate-200 rounded-lg p-3">
                {paragraph}
              </p>
            ))}
          </div>
          {paragraphCount > paragraphs.length && (
            <p className="text-xs text-slate-400 mt-2">+ még {paragraphCount - paragraphs.length} bekezdés…</p>
          )}
        </div>
      )}

      {listHighlights.length > 0 && (
        <div>
          <h4 className="text-sm font-semibold text-slate-700 uppercase tracking-wide mb-2">Fontos listák</h4>
          <div className="space-y-4">
            {listHighlights.map((list, index) => (
              <div key={index} className="bg-slate-50 border border-slate-200 rounded-lg p-4">
                <ul className="list-disc list-inside text-sm text-slate-600 space-y-1">
                  {list.items.slice(0, 5).map((item, itemIndex) => (
                    <li key={itemIndex}>{item}</li>
                  ))}
                </ul>
                {list.items.length > 5 && (
                  <p className="text-xs text-slate-400 mt-2">+ még {list.items.length - 5} tétel…</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

DocumentPreview.propTypes = {
  preview: PropTypes.shape({
    type: PropTypes.string.isRequired,
    headings: PropTypes.arrayOf(
      PropTypes.shape({
        level: PropTypes.number,
        text: PropTypes.string
      })
    ),
    paragraphs: PropTypes.arrayOf(PropTypes.string),
    paragraphCount: PropTypes.number,
    wordCount: PropTypes.number,
    listHighlights: PropTypes.arrayOf(
      PropTypes.shape({
        type: PropTypes.string,
        items: PropTypes.arrayOf(PropTypes.string)
      })
    ),
    headers: PropTypes.arrayOf(PropTypes.string),
    rowSamples: PropTypes.arrayOf(
      PropTypes.arrayOf(PropTypes.string)
    ),
    sampleCount: PropTypes.number,
    totalRows: PropTypes.number,
    totalColumns: PropTypes.number,
    detectedColumns: PropTypes.arrayOf(PropTypes.string),
    emptyCellRatio: PropTypes.number
  })
}

export default DocumentPreview

