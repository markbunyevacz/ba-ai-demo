const downloadBlob = (blob, filename) => {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

export const exportAsJson = (data, filename = 'compliance-report.json') => {
  const serialized = JSON.stringify(data, null, 2)
  const blob = new Blob([serialized], { type: 'application/json' })
  downloadBlob(blob, filename)
}

const toCsvRow = (values = []) => values
  .map(value => {
    if (value === null || value === undefined) return ''
    const stringValue = String(value)
    if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
      return `"${stringValue.replace(/"/g, '""')}"`
    }
    return stringValue
  })
  .join(',')

export const exportAsCsv = (rows = [], headers = [], filename = 'compliance-report.csv') => {
  const csvLines = []
  if (headers.length > 0) {
    csvLines.push(toCsvRow(headers))
  }

  rows.forEach(row => {
    const values = headers.length > 0
      ? headers.map(key => row[key])
      : Object.values(row)
    csvLines.push(toCsvRow(values))
  })

  const blob = new Blob([csvLines.join('\n')], { type: 'text/csv;charset=utf-8;' })
  downloadBlob(blob, filename)
}

export default {
  exportAsJson,
  exportAsCsv
}


