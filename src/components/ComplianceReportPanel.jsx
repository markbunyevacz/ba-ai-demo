import { useState, useEffect } from 'react'
import PropTypes from 'prop-types'

import complianceClient from '../services/complianceClient.js'
import monitoringService from '../services/monitoringService.js'
import { exportAsCsv, exportAsJson } from '../utils/exportUtils.js'
import ComplianceReportModal from './ComplianceReportModal.jsx'

const buildCsvRows = (report) => {
  const rows = []
  const tickets = report?.nonCompliantTickets || []

  tickets.forEach(ticket => {
    rows.push({
      Ticket: ticket.ticketId,
      Status: ticket.status,
      Score: ticket.overallScore ?? 0,
      Gaps: (ticket.gaps || []).map(gap => gap.message || gap.reason || '').filter(Boolean).join(' | ')
    })
  })

  return rows
}

const ComplianceReportPanel = ({ tickets }) => {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [report, setReport] = useState(null)
  const [showModal, setShowModal] = useState(false)
  const [availableStandards, setAvailableStandards] = useState([])
  const [selectedStandard, setSelectedStandard] = useState('ALL')
  const [standardsLoading, setStandardsLoading] = useState(false)
  const [standardsError, setStandardsError] = useState('')
  const [reportHistory, setReportHistory] = useState(() => monitoringService.getComplianceReports())

  const hasTickets = Array.isArray(tickets) && tickets.length > 0

  useEffect(() => {
    let isMounted = true

    const loadStandards = async () => {
      setStandardsLoading(true)
      setStandardsError('')
      try {
        const standards = await complianceClient.fetchStandards()
        if (isMounted) {
          setAvailableStandards(Array.isArray(standards) ? standards : [])
        }
      } catch (err) {
        if (isMounted) {
          setStandardsError(err?.message || 'Nem sikerült betölteni a szabványokat, alapértelmezett értékek használata.')
          setAvailableStandards([])
        }
      } finally {
        if (isMounted) {
          setStandardsLoading(false)
        }
      }
    }

    loadStandards()
    setReportHistory(monitoringService.getComplianceReports())
    return () => {
      isMounted = false
    }
  }, [])

  const handleGenerateReport = async () => {
    if (!hasTickets) {
      setError('Nincs elérhető ticket a riporthoz.')
      return
    }

    const requestedStandards = selectedStandard === 'ALL' ? [] : [selectedStandard]
    const sessionId = monitoringService.trackRequest({
      endpoint: '/api/compliance/report',
      type: 'compliance-report',
      tickets: tickets.length,
      standards: requestedStandards
    })

    setLoading(true)
    setError('')

    try {
      const payload = requestedStandards.length > 0 ? { standards: requestedStandards } : {}
      const data = await complianceClient.generateReport(tickets, payload)
      setReport(data)
      setShowModal(true)

      monitoringService.trackCompletion(sessionId, {
        success: true,
        ticketsEvaluated: data?.totalTickets || 0,
        averageScore: data?.averageScore || 0,
        standards: requestedStandards.length > 0 ? requestedStandards : ['ALL']
      })
      setReportHistory(monitoringService.getComplianceReports())
    } catch (err) {
      const message = err?.message || 'Nem sikerült a riport létrehozása.'
      setError(message)
      monitoringService.trackCompletion(sessionId, {
        success: false,
        error: message,
        standards: requestedStandards.length > 0 ? requestedStandards : ['ALL']
      })
      setReportHistory(monitoringService.getComplianceReports())
    } finally {
      setLoading(false)
    }
  }

  const handleExportJson = () => {
    if (!report) return
    exportAsJson(report, `compliance-report-${Date.now()}.json`)
  }

  const handleExportCsv = () => {
    if (!report) return
    const rows = buildCsvRows(report)
    exportAsCsv(rows, ['Ticket', 'Status', 'Score', 'Gaps'], `compliance-report-${Date.now()}.csv`)
  }

  return (
    <div className="mt-6">
      <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div>
            <h4 className="text-lg font-semibold text-[#003366]">Standards Compliance Report</h4>
            <p className="text-sm text-slate-500">PMI/BABOK riport generálása és exportálása</p>
            <div className="mt-3 flex items-center gap-2 text-xs text-slate-600">
              <label htmlFor="compliance-standard" className="font-semibold text-slate-700">
                Szabvány:
              </label>
              <select
                id="compliance-standard"
                className="border border-slate-200 rounded-md px-2 py-1 text-xs"
                value={selectedStandard}
                onChange={(event) => setSelectedStandard(event.target.value)}
                disabled={standardsLoading}
              >
                <option value="ALL">Összes (PMI + BABOK)</option>
                {(availableStandards.length > 0 ? availableStandards : ['PMI', 'BABOK']).map(standard => (
                  <option key={standard} value={standard}>{standard}</option>
                ))}
              </select>
              {standardsLoading && <span className="text-slate-400">Betöltés...</span>}
            </div>
            {standardsError && (
              <p className="mt-2 text-xs text-amber-600">{standardsError}</p>
            )}
          </div>
          <button
            type="button"
            onClick={handleGenerateReport}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition ${loading ? 'bg-slate-200 text-slate-500 cursor-not-allowed' : 'bg-indigo-600 text-white hover:bg-indigo-700'}`}
            disabled={loading}
          >
            {loading ? 'Riport készítése...' : 'Compliance riport generálása'}
          </button>
        </div>
        {error && (
          <div className="mt-3 text-sm text-red-600 bg-red-50 border border-red-200 px-3 py-2 rounded">
            {error}
          </div>
        )}
        {!hasTickets && (
          <p className="mt-2 text-xs text-slate-400">A riport készítéséhez előbb töltse be a ticketeket.</p>
        )}
      </div>

      {showModal && report && (
        <ComplianceReportModal
          report={report}
          onClose={() => setShowModal(false)}
          onExportJson={handleExportJson}
          onExportCsv={handleExportCsv}
        />
      )}

      {reportHistory.length > 0 && (
        <div className="mt-4 bg-slate-50 border border-slate-200 rounded-lg p-4">
          <h5 className="text-sm font-semibold text-slate-700 mb-2">Legutóbbi compliance riportok</h5>
          <ul className="space-y-1 text-xs text-slate-600">
            {reportHistory.map(entry => (
              <li key={entry.id} className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-semibold text-slate-700">{new Date(entry.timestamp).toLocaleString()}</span>
                <span>Szabvány: {entry.standards.join(', ')}</span>
                <span>Riport státusz: {entry.success ? 'sikeres' : 'sikertelen'}</span>
                <span>Ticketek: {entry.ticketsEvaluated}</span>
                {typeof entry.averageScore === 'number' && (
                  <span>Átlagpontszám: {Math.round(entry.averageScore * 100)}%</span>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}

ComplianceReportPanel.propTypes = {
  tickets: PropTypes.arrayOf(PropTypes.object)
}

ComplianceReportPanel.defaultProps = {
  tickets: []
}

export default ComplianceReportPanel


