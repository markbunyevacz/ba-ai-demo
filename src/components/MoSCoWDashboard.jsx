import { useMemo } from 'react'
import PropTypes from 'prop-types'

import prioritizationService from '../services/prioritizationService.js'

const CATEGORY_STYLES = {
  'Must have': {
    border: 'border-red-200',
    background: 'bg-red-50',
    text: 'text-red-700',
    badge: 'bg-red-100 text-red-800'
  },
  'Should have': {
    border: 'border-orange-200',
    background: 'bg-orange-50',
    text: 'text-orange-700',
    badge: 'bg-orange-100 text-orange-800'
  },
  'Could have': {
    border: 'border-emerald-200',
    background: 'bg-emerald-50',
    text: 'text-emerald-700',
    badge: 'bg-emerald-100 text-emerald-800'
  },
  "Won't have": {
    border: 'border-slate-200',
    background: 'bg-slate-50',
    text: 'text-slate-600',
    badge: 'bg-slate-100 text-slate-700'
  }
}

const formatScore = (score) => (score !== undefined && score !== null ? `${score.toFixed(0)} / 100` : 'n/a')

const MoSCoWDashboard = ({ tickets, summary, categories, onClassificationChange }) => {
  const effectiveCategories = useMemo(
    () => categories && categories.length > 0 ? categories : prioritizationService.getCategoryOrder(),
    [categories]
  )

  const computedSummary = useMemo(
    () => summary || prioritizationService.getPortfolioSummary(tickets),
    [summary, tickets]
  )

  if (!tickets || tickets.length === 0) {
    return null
  }

  const handleChange = (ticketId, event) => {
    if (typeof onClassificationChange === 'function') {
      onClassificationChange(ticketId, event.target.value)
    }
  }

  return (
    <section className="bg-white rounded-lg shadow-sm border border-slate-200">
      <header className="px-6 py-5 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h3 className="text-xl font-semibold text-slate-900">MoSCoW prioritization áttekintés</h3>
          <p className="text-sm text-slate-500">Prioritási kategóriák kezelése és manuális finomhangolása</p>
        </div>
        <div className="flex items-center gap-3 text-sm text-slate-600">
          <span className="px-3 py-1 bg-slate-100 rounded-full">Összesen: {computedSummary.total}</span>
          <span className="px-3 py-1 bg-slate-100 rounded-full">Must have arány: {computedSummary.completion}%</span>
          <span className="px-3 py-1 bg-slate-100 rounded-full">Terheltség: {computedSummary.readiness}</span>
        </div>
      </header>

      <div className="px-6 py-5 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {effectiveCategories.map(category => {
            const style = CATEGORY_STYLES[category] || CATEGORY_STYLES['Should have']
            const info = computedSummary.categories[category] || { count: 0, averageScore: 0 }

            return (
              <div
                key={category}
                className={`p-4 rounded-lg border ${style.border} ${style.background} flex flex-col space-y-2`}
              >
                <span className={`text-xs font-semibold uppercase tracking-wide ${style.text}`}>{category}</span>
                <span className="text-3xl font-bold text-slate-900">{info.count}</span>
                <span className="text-sm text-slate-600">Átlag pontszám: {info.averageScore?.toFixed(1) ?? '0.0'}</span>
              </div>
            )
          })}
        </div>

        {computedSummary.riskAlerts && computedSummary.riskAlerts.length > 0 && (
          <div className="border border-amber-200 bg-amber-50 rounded-lg p-4">
            <h4 className="text-sm font-semibold text-amber-800 mb-2">Kiemelt kockázatok</h4>
            <ul className="space-y-1 text-sm text-amber-700">
              {computedSummary.riskAlerts.map(alert => (
                <li key={`${alert.ticketId}-${alert.score}`}>
                  <span className="font-semibold">{alert.ticketId}:</span> {alert.message} ({alert.score.toFixed(1)} pont)
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Ticket</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Összefoglaló</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">MoSCoW</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Pontszám</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500 hidden lg:table-cell">Magyarázat</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-sm text-slate-700">
              {tickets.map(ticket => {
                const meta = ticket._prioritization || {}
                const category = ticket.moscowClassification || prioritizationService.getBaseCategoryFromPriority(ticket.priority)
                const style = CATEGORY_STYLES[category] || CATEGORY_STYLES['Should have']

                return (
                  <tr key={ticket.id || ticket.summary} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-mono text-xs text-slate-500">{ticket.id || 'N/A'}</td>
                    <td className="px-4 py-3 max-w-xs">
                      <div className="text-slate-900 font-medium leading-snug line-clamp-2">{ticket.summary}</div>
                      {ticket.priority && (
                        <div className="text-xs text-slate-500 mt-1">Eredeti prioritás: {ticket.priority}</div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-1 rounded-full text-xs font-semibold ${style.badge}`}>{category}</span>
                        <select
                          aria-label={`${ticket.id || ticket.summary} MoSCoW besorolás`}
                          className="text-xs border border-slate-200 rounded-md px-2 py-1 focus:ring focus:ring-indigo-200 focus:border-indigo-400"
                          value={category}
                          onChange={(event) => handleChange(ticket.id || ticket.summary, event)}
                        >
                          {effectiveCategories.map(option => (
                            <option key={option} value={option}>{option}</option>
                          ))}
                        </select>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm font-medium text-slate-900">{formatScore(meta.score)}</span>
                    </td>
                    <td className="px-4 py-3 hidden lg:table-cell text-xs text-slate-500">
                      {Array.isArray(meta.rationale) && meta.rationale.length > 0 ? (
                        <ul className="space-y-1">
                          {meta.rationale.slice(0, 2).map((reason, index) => (
                            <li key={index}>• {reason}</li>
                          ))}
                        </ul>
                      ) : (
                        <span>Nincs indoklás</span>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  )
}

MoSCoWDashboard.propTypes = {
  tickets: PropTypes.arrayOf(PropTypes.shape({
    id: PropTypes.string,
    summary: PropTypes.string,
    priority: PropTypes.string,
    moscowClassification: PropTypes.string,
    _prioritization: PropTypes.object
  })),
  summary: PropTypes.shape({
    total: PropTypes.number,
    completion: PropTypes.number,
    readiness: PropTypes.string,
    categories: PropTypes.object,
    riskAlerts: PropTypes.array
  }),
  categories: PropTypes.arrayOf(PropTypes.string),
  onClassificationChange: PropTypes.func
}

MoSCoWDashboard.defaultProps = {
  tickets: [],
  summary: null,
  categories: null,
  onClassificationChange: undefined
}

export default MoSCoWDashboard


