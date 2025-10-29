import { useState } from 'react'
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

  const hasTickets = Array.isArray(tickets) && tickets.length > 0

  const handleGenerateReport = async () => {
    if (!hasTickets) {
      setError('Nincs elérhető ticket a riporthoz.')
      return
    }

    const sessionId = monitoringService.trackRequest({
      endpoint: '/api/compliance/report',
      type: 'compliance-report',
      tickets: tickets.length
    })

    setLoading(true)
    setError('')

    try {
      const data = await complianceClient.generateReport(tickets)
      setReport(data)
      setShowModal(true)

      monitoringService.trackCompletion(sessionId, {
        success: true,
        ticketsEvaluated: data?.totalTickets || 0,
        averageScore: data?.averageScore || 0
      })
    } catch (err) {
      const message = err?.message || 'Nem sikerült a riport létrehozása.'
      setError(message)
      monitoringService.trackCompletion(sessionId, {
        success: false,
        error: message
      })
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


