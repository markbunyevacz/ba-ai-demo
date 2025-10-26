import React, { useState } from 'react'
import StakeholderMatrix from './StakeholderMatrix'

const StakeholderDashboard = ({ stakeholders, matrix, recommendations, network, validation }) => {
  const [activeTab, setActiveTab] = useState('overview')
  const [sortBy, setSortBy] = useState('frequency')

  if (!stakeholders || stakeholders.length === 0) {
    return (
      <div className="bg-white rounded-lg p-8 text-center border-2 border-dashed border-gray-300">
        <p className="text-gray-500 text-lg">No stakeholder data available</p>
        <p className="text-gray-400 text-sm mt-2">Upload tickets and generate analysis to see stakeholder insights</p>
      </div>
    )
  }

  // Sort stakeholders
  const sortedStakeholders = [...stakeholders].sort((a, b) => {
    switch (sortBy) {
      case 'frequency':
        return b.frequency - a.frequency
      case 'confidence':
        return (b.confidence || 0) - (a.confidence || 0)
      case 'power':
        const powerOrder = { High: 3, Medium: 2, Low: 1 }
        return (powerOrder[b.power] || 0) - (powerOrder[a.power] || 0)
      case 'name':
        return a.name.localeCompare(b.name)
      default:
        return 0
    }
  })

  // Get top stakeholders by influence
  const topInfluencers = network?.network?.topInfluencers || []

  // Count by type
  const typeCount = stakeholders.reduce((acc, s) => {
    acc[s.type] = (acc[s.type] || 0) + 1
    return acc
  }, {})

  // Count by quadrant
  const quadrantCount = {
    manage: matrix?.highPowerHighInterest?.length || 0,
    keep_satisfied: matrix?.highPowerLowInterest?.length || 0,
    keep_informed: matrix?.lowPowerHighInterest?.length || 0,
    monitor: matrix?.lowPowerLowInterest?.length || 0
  }

  // Validation alerts
  const hasIssues = validation?.issues?.length > 0
  const hasWarnings = validation?.warnings?.length > 0
  const hasHallucinations = validation?.hallucinations?.length > 0

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-600 to-indigo-600 rounded-lg shadow-lg p-8 text-white">
        <h1 className="text-4xl font-bold mb-2">Stakeholder Analysis Dashboard</h1>
        <p className="text-purple-100">Comprehensive stakeholder identification and engagement planning</p>
        <div className="grid grid-cols-4 gap-4 mt-6">
          <div>
            <p className="text-4xl font-bold">{stakeholders.length}</p>
            <p className="text-purple-100 text-sm">Total Stakeholders</p>
          </div>
          <div>
            <p className="text-4xl font-bold">{topInfluencers.length}</p>
            <p className="text-purple-100 text-sm">Top Influencers</p>
          </div>
          <div>
            <p className="text-4xl font-bold">{Object.keys(typeCount).length}</p>
            <p className="text-purple-100 text-sm">Stakeholder Types</p>
          </div>
          <div>
            <p className="text-4xl font-bold">{(matrix?.summary?.total || 0).toFixed(0)}</p>
            <p className="text-purple-100 text-sm">Analyzed</p>
          </div>
        </div>
      </div>

      {/* Validation Alerts */}
      {(hasIssues || hasWarnings || hasHallucinations) && (
        <div className="space-y-3">
          {hasIssues && (
            <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-r-lg">
              <h3 className="font-bold text-red-800 mb-2">⚠️ Issues Found</h3>
              <ul className="text-sm text-red-700 space-y-1">
                {validation.issues.slice(0, 3).map((issue, idx) => (
                  <li key={idx}>• {issue}</li>
                ))}
                {validation.issues.length > 3 && <li>• +{validation.issues.length - 3} more issues</li>}
              </ul>
            </div>
          )}
          {hasHallucinations && (
            <div className="bg-yellow-50 border-l-4 border-yellow-500 p-4 rounded-r-lg">
              <h3 className="font-bold text-yellow-800 mb-2">🔍 Potential Hallucinations</h3>
              <ul className="text-sm text-yellow-700 space-y-1">
                {validation.hallucinations.slice(0, 3).map((hal, idx) => (
                  <li key={idx}>• {hal.name}: {hal.reason}</li>
                ))}
                {validation.hallucinations.length > 3 && <li>• +{validation.hallucinations.length - 3} more</li>}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Tabs */}
      <div className="bg-white rounded-lg shadow-lg overflow-hidden">
        <div className="border-b border-gray-200 flex">
          {['overview', 'matrix', 'topstakeholders', 'recommendations'].map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-6 py-4 font-semibold transition-colors ${
                activeTab === tab
                  ? 'border-b-2 border-blue-600 text-blue-600 bg-blue-50'
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1).replace(/([A-Z])/g, ' $1')}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="p-8">
          {/* Overview Tab */}
          {activeTab === 'overview' && (
            <div className="space-y-8">
              {/* Key Metrics */}
              <div>
                <h2 className="text-2xl font-bold text-gray-800 mb-4">Key Metrics</h2>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-gradient-to-br from-red-50 to-red-100 p-4 rounded-lg border-l-4 border-red-500">
                    <p className="text-3xl font-bold text-red-600">{quadrantCount.manage}</p>
                    <p className="text-sm text-gray-600 mt-1">Manage Closely</p>
                  </div>
                  <div className="bg-gradient-to-br from-orange-50 to-orange-100 p-4 rounded-lg border-l-4 border-orange-500">
                    <p className="text-3xl font-bold text-orange-600">{quadrantCount.keep_satisfied}</p>
                    <p className="text-sm text-gray-600 mt-1">Keep Satisfied</p>
                  </div>
                  <div className="bg-gradient-to-br from-green-50 to-green-100 p-4 rounded-lg border-l-4 border-green-500">
                    <p className="text-3xl font-bold text-green-600">{quadrantCount.keep_informed}</p>
                    <p className="text-sm text-gray-600 mt-1">Keep Informed</p>
                  </div>
                  <div className="bg-gradient-to-br from-gray-50 to-gray-100 p-4 rounded-lg border-l-4 border-gray-400">
                    <p className="text-3xl font-bold text-gray-600">{quadrantCount.monitor}</p>
                    <p className="text-sm text-gray-600 mt-1">Monitor</p>
                  </div>
                </div>
              </div>

              {/* Stakeholder Type Distribution */}
              <div>
                <h2 className="text-2xl font-bold text-gray-800 mb-4">Stakeholder Types</h2>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {Object.entries(typeCount).map(([type, count]) => (
                    <div key={type} className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                      <p className="text-2xl font-bold text-gray-800">{count}</p>
                      <p className="text-sm text-gray-600 mt-1">{type}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Network Metrics */}
              {network && (
                <div>
                  <h2 className="text-2xl font-bold text-gray-800 mb-4">Relationship Network</h2>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-white p-4 rounded-lg border border-blue-200">
                      <p className="text-2xl font-bold text-blue-600">{network.network?.nodeCount || 0}</p>
                      <p className="text-sm text-gray-600 mt-1">Stakeholders (Nodes)</p>
                    </div>
                    <div className="bg-white p-4 rounded-lg border border-green-200">
                      <p className="text-2xl font-bold text-green-600">{network.network?.edgeCount || 0}</p>
                      <p className="text-sm text-gray-600 mt-1">Relationships (Edges)</p>
                    </div>
                    <div className="bg-white p-4 rounded-lg border border-purple-200">
                      <p className="text-2xl font-bold text-purple-600">{(network.network?.density || 0).toFixed(2)}</p>
                      <p className="text-sm text-gray-600 mt-1">Network Density</p>
                    </div>
                    <div className="bg-white p-4 rounded-lg border border-orange-200">
                      <p className="text-2xl font-bold text-orange-600">{topInfluencers.length}</p>
                      <p className="text-sm text-gray-600 mt-1">Key Influencers</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Matrix Tab */}
          {activeTab === 'matrix' && (
            <StakeholderMatrix matrix={matrix} recommendations={recommendations} />
          )}

          {/* Top Stakeholders Tab */}
          {activeTab === 'topstakeholders' && (
            <div className="space-y-4">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-2xl font-bold text-gray-800">Top Stakeholders</h2>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="frequency">By Frequency</option>
                  <option value="confidence">By Confidence</option>
                  <option value="power">By Power</option>
                  <option value="name">By Name</option>
                </select>
              </div>

              <div className="space-y-3">
                {sortedStakeholders.slice(0, 15).map((stakeholder, idx) => (
                  <div key={idx} className="bg-gray-50 p-4 rounded-lg border border-gray-200 hover:shadow-lg transition-shadow">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h3 className="font-bold text-lg text-gray-800">{idx + 1}. {stakeholder.name}</h3>
                        <p className="text-sm text-gray-600">{stakeholder.type}</p>
                      </div>
                      <div className="flex gap-2">
                        <span className="px-3 py-1 bg-blue-100 text-blue-800 text-xs font-semibold rounded-full">
                          {stakeholder.power}
                        </span>
                        <span className="px-3 py-1 bg-green-100 text-green-800 text-xs font-semibold rounded-full">
                          {stakeholder.interest}
                        </span>
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-4 text-sm">
                      <div>
                        <p className="text-gray-600">Mentions</p>
                        <p className="text-lg font-bold text-gray-800">{stakeholder.frequency}</p>
                      </div>
                      <div>
                        <p className="text-gray-600">Confidence</p>
                        <p className="text-lg font-bold text-gray-800">{Math.round((stakeholder.confidence || 0) * 100)}%</p>
                      </div>
                      <div>
                        <p className="text-gray-600">Quadrant</p>
                        <p className="text-lg font-bold" style={{ color: stakeholder.color }}>
                          {stakeholder.quadrant?.replace('-', ' ') || 'Unknown'}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Recommendations Tab */}
          {activeTab === 'recommendations' && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold text-gray-800">Engagement Recommendations</h2>
              {recommendations && recommendations.length > 0 ? (
                recommendations.map((rec, idx) => (
                  <div key={idx} className="bg-white border-2 rounded-lg overflow-hidden" style={{
                    borderColor: rec.color
                  }}>
                    <div className="p-4" style={{ backgroundColor: `${rec.color}10` }}>
                      <h3 className="text-xl font-bold text-gray-800 mb-1">{rec.title}</h3>
                      <p className="text-sm text-gray-600 mb-4">{rec.stakeholders.length} stakeholders</p>

                      <div className="mb-4">
                        <h4 className="font-bold text-gray-800 mb-3">Recommended Strategies:</h4>
                        <ul className="space-y-2">
                          {rec.strategies.map((strategy, sidx) => (
                            <li key={sidx} className="text-sm text-gray-700 flex items-start">
                              <span className="mr-3 mt-1 flex-shrink-0">✓</span>
                              <span>{strategy}</span>
                            </li>
                          ))}
                        </ul>
                      </div>

                      {rec.stakeholders.length > 0 && (
                        <div className="border-t border-gray-200 pt-4">
                          <h4 className="font-semibold text-gray-800 mb-2">Key Stakeholders:</h4>
                          <div className="flex flex-wrap gap-2">
                            {rec.stakeholders.slice(0, 5).map((s, sidx) => (
                              <span key={sidx} className="px-3 py-1 bg-white rounded-full text-sm font-semibold" style={{
                                color: rec.color,
                                border: `1px solid ${rec.color}`
                              }}>
                                {s.name}
                              </span>
                            ))}
                            {rec.stakeholders.length > 5 && (
                              <span className="px-3 py-1 bg-gray-200 rounded-full text-sm font-semibold text-gray-700">
                                +{rec.stakeholders.length - 5} more
                              </span>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-gray-500">No recommendations available</p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default StakeholderDashboard
