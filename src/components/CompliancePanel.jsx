import PropTypes from 'prop-types'

const STATUS_LABELS = {
  compliant: { label: 'Compliant', className: 'bg-green-100 text-green-700 border-green-200' },
  partial: { label: 'Partial', className: 'bg-yellow-100 text-yellow-700 border-yellow-200' },
  gap: { label: 'Gap', className: 'bg-red-100 text-red-700 border-red-200' }
}

const formatPercent = (value) => `${Math.round(value * 100)}%`

const CompliancePanel = ({ items }) => {
  if (!items || items.length === 0) {
    return null
  }

  const statusCounts = items.reduce((acc, item) => {
    const status = item.compliance?.status
    if (status) {
      acc[status] = (acc[status] || 0) + 1
    }
    return acc
  }, {})

  const standardsAggregate = items.reduce((acc, item) => {
    const standards = item.compliance?.standards || []
    standards.forEach(standard => {
      if (!acc[standard.id]) {
        acc[standard.id] = {
          name: standard.name,
          totalScore: 0,
          count: 0,
          compliant: 0
        }
      }

      acc[standard.id].totalScore += standard.score || 0
      acc[standard.id].count += 1
      if (standard.status === 'compliant') {
        acc[standard.id].compliant += 1
      }
    })
    return acc
  }, {})

  const recommendations = []
  items.forEach(item => {
    const { compliance } = item
    if (!compliance) return

    compliance.standards?.forEach(standard => {
      standard.warnings?.slice(0, 2).forEach(warning => {
        recommendations.push({
          ticketId: compliance.ticketId,
          standard: standard.name,
          message: warning.message || warning.reason || 'Review recommended'
        })
      })

      standard.gaps?.slice(0, 2).forEach(gap => {
        recommendations.push({
          ticketId: compliance.ticketId,
          standard: standard.name,
          message: gap.message || gap.reason || 'Gap detected'
        })
      })
    })
  })

  const topRecommendations = recommendations.slice(0, 5)

  return (
    <div className="mt-6 pt-6 border-t border-gray-200">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h4 className="text-lg font-semibold text-gray-800">Standards Compliance</h4>
          <p className="text-sm text-gray-500">PMI PMBOK & IIBA BABOK coverage across generated tickets</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="bg-slate-50 rounded-lg p-4">
          <h5 className="text-sm font-semibold text-slate-700 mb-3">Compliance Status</h5>
          <div className="flex flex-wrap gap-2">
            {Object.entries(statusCounts).map(([status, count]) => {
              const config = STATUS_LABELS[status] || STATUS_LABELS.partial
              return (
                <span
                  key={status}
                  className={`px-3 py-1 text-xs font-semibold rounded-full border ${config.className}`}
                >
                  {config.label}: {count}
                </span>
              )
            })}
            {Object.keys(statusCounts).length === 0 && (
              <span className="text-xs text-slate-500">No compliance data available</span>
            )}
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-lg p-4">
          <h5 className="text-sm font-semibold text-slate-700 mb-3">Standard Scores</h5>
          <div className="space-y-3">
            {Object.entries(standardsAggregate).map(([id, data]) => {
              const averageScore = data.count > 0 ? data.totalScore / data.count : 0
              const complianceRate = data.count > 0 ? data.compliant / data.count : 0
              return (
                <div key={id} className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-medium text-slate-800">{data.name}</div>
                    <div className="text-xs text-slate-500">{formatPercent(complianceRate)} compliant</div>
                  </div>
                  <div className="text-sm font-semibold text-[#003366]">{formatPercent(averageScore)}</div>
                </div>
              )
            })}
            {Object.keys(standardsAggregate).length === 0 && (
              <p className="text-xs text-slate-500">No standards evaluated yet.</p>
            )}
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-lg p-4">
          <h5 className="text-sm font-semibold text-slate-700 mb-3">Top Recommendations</h5>
          <div className="space-y-2 max-h-40 overflow-auto">
            {topRecommendations.length > 0 ? (
              topRecommendations.map((rec, index) => (
                <div key={`${rec.ticketId}-${index}`} className="text-xs text-slate-600 border-l-2 border-indigo-200 pl-2">
                  <div className="font-semibold text-slate-700">{rec.standard}</div>
                  <div>{rec.message}</div>
                  <div className="text-[10px] text-slate-400 mt-1">Ticket: {rec.ticketId}</div>
                </div>
              ))
            ) : (
              <p className="text-xs text-slate-500">No recommendations recorded.</p>
            )}
          </div>
        </div>
      </div>

      <div className="mt-6">
        <h5 className="text-sm font-semibold text-slate-700 mb-2">Ticket Compliance Overview</h5>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {items.map(item => {
            const status = item.compliance?.status
            const config = STATUS_LABELS[status] || STATUS_LABELS.partial
            const standards = item.compliance?.standards || []
            return (
              <div key={item.id || item.compliance.ticketId} className="border border-slate-200 rounded-lg p-3 bg-white">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <div className="text-sm font-semibold text-slate-800">{item.summary || item.id || item.compliance.ticketId}</div>
                    <div className="text-xs text-slate-500">{item.compliance.ticketId}</div>
                  </div>
                  <span className={`px-2 py-1 text-xs font-semibold rounded-full border ${config.className}`}>
                    {config.label}
                  </span>
                </div>
                <div className="space-y-1 text-xs text-slate-600">
                  {standards.map(standard => (
                    <div key={standard.id} className="flex items-center justify-between">
                      <span>{standard.name}</span>
                      <span className="font-semibold text-slate-700">{formatPercent(standard.score || 0)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

CompliancePanel.propTypes = {
  items: PropTypes.arrayOf(PropTypes.shape({
    id: PropTypes.string,
    summary: PropTypes.string,
    compliance: PropTypes.shape({
      ticketId: PropTypes.string,
      status: PropTypes.string,
      overallScore: PropTypes.number,
      standards: PropTypes.arrayOf(PropTypes.shape({
        id: PropTypes.string,
        name: PropTypes.string,
        score: PropTypes.number,
        status: PropTypes.string,
        warnings: PropTypes.array,
        gaps: PropTypes.array
      }))
    })
  }))
}

CompliancePanel.defaultProps = {
  items: []
}

export default CompliancePanel


