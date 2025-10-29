import PropTypes from 'prop-types'

const formatPercent = (value) => `${Math.round((value || 0) * 100)}%`

const ComplianceReportModal = ({
  report,
  onClose,
  onExportJson,
  onExportCsv
}) => {
  if (!report) return null

  const breakdownEntries = Object.entries(report.standardBreakdown || {})
  const nonCompliant = report.nonCompliantTickets || []

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-5xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
          <div>
            <h3 className="text-xl font-semibold text-slate-900">Compliance Report</h3>
            <p className="text-xs text-slate-500">Generated at {new Date(report.timestamp || Date.now()).toLocaleString()}</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              className="px-3 py-1 text-xs font-semibold text-indigo-700 bg-indigo-100 rounded-full hover:bg-indigo-200"
              onClick={onExportJson}
            >
              Export JSON
            </button>
            <button
              type="button"
              className="px-3 py-1 text-xs font-semibold text-teal-700 bg-teal-100 rounded-full hover:bg-teal-200"
              onClick={onExportCsv}
            >
              Export CSV
            </button>
            <button
              type="button"
              className="text-slate-400 hover:text-slate-600"
              aria-label="Close compliance report"
              onClick={onClose}
            >
              ✕
            </button>
          </div>
        </div>

        <div className="px-6 py-4 space-y-4 overflow-y-auto">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-slate-50 rounded-lg p-4">
              <div className="text-xs text-slate-500">Total Tickets</div>
              <div className="text-2xl font-bold text-slate-900">{report.totalTickets}</div>
            </div>
            <div className="bg-slate-50 rounded-lg p-4">
              <div className="text-xs text-slate-500">Average Score</div>
              <div className="text-2xl font-bold text-indigo-700">{formatPercent(report.averageScore ?? 0)}</div>
            </div>
            <div className="bg-slate-50 rounded-lg p-4">
              <div className="text-xs text-slate-500">Compliant Standards</div>
              <div className="text-2xl font-bold text-emerald-600">
                {breakdownEntries.filter(([, value]) => value.complianceRate >= 0.8).length}
              </div>
            </div>
            <div className="bg-slate-50 rounded-lg p-4">
              <div className="text-xs text-slate-500">Non-Compliant Tickets</div>
              <div className="text-2xl font-bold text-rose-600">{nonCompliant.length}</div>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-lg p-4">
            <h4 className="text-sm font-semibold text-slate-700 mb-3">Standard Breakdown</h4>
            <div className="space-y-3">
              {breakdownEntries.length > 0 ? (
                breakdownEntries.map(([id, data]) => (
                  <div key={id} className="flex items-center justify-between border-b border-slate-100 pb-2 last:border-b-0 last:pb-0">
                    <div>
                      <div className="text-sm font-semibold text-slate-800">{id}</div>
                      <div className="text-xs text-slate-500">{data.evaluated} tickets evaluated</div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs text-slate-500">Average Score</div>
                      <div className="text-sm font-semibold text-indigo-700">{formatPercent(data.averageScore ?? 0)}</div>
                      <div className="text-xs text-slate-500">Compliance Rate: {formatPercent(data.complianceRate ?? 0)}</div>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-xs text-slate-500">No standard breakdown available.</p>
              )}
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-lg">
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200">
              <h4 className="text-sm font-semibold text-slate-700">Non-Compliant Tickets</h4>
              <span className="text-xs text-slate-500">{nonCompliant.length} records</span>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200 text-sm">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Ticket</th>
                    <th className="px-4 py-2 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Status</th>
                    <th className="px-4 py-2 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Score</th>
                    <th className="px-4 py-2 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Gaps</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 text-xs text-slate-600">
                  {nonCompliant.length > 0 ? (
                    nonCompliant.map(item => (
                      <tr key={item.ticketId}>
                        <td className="px-4 py-2 font-semibold text-slate-800">{item.ticketId}</td>
                        <td className="px-4 py-2 capitalize">{item.status}</td>
                        <td className="px-4 py-2">{formatPercent(item.overallScore ?? 0)}</td>
                        <td className="px-4 py-2">
                          {(item.gaps || []).slice(0, 3).map((gap, index) => (
                            <div key={index} className="mb-1 last:mb-0">{gap.message || gap.reason || 'Gap detected'}</div>
                          ))}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="4" className="px-4 py-6 text-center text-slate-400">All tickets compliant 🎉</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

ComplianceReportModal.propTypes = {
  report: PropTypes.shape({
    totalTickets: PropTypes.number,
    averageScore: PropTypes.number,
    standardBreakdown: PropTypes.object,
    nonCompliantTickets: PropTypes.array,
    timestamp: PropTypes.string
  }),
  onClose: PropTypes.func.isRequired,
  onExportJson: PropTypes.func.isRequired,
  onExportCsv: PropTypes.func.isRequired
}

ComplianceReportModal.defaultProps = {
  report: null
}

export default ComplianceReportModal


