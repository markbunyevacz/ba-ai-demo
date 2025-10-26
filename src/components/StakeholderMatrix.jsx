import React, { useState } from 'react'

const StakeholderMatrix = ({ matrix, recommendations }) => {
  const [selectedQuadrant, setSelectedQuadrant] = useState(null)
  const [expandedStakeholder, setExpandedStakeholder] = useState(null)

  if (!matrix) {
    return (
      <div className="bg-white rounded-lg p-6 border-2 border-gray-200">
        <p className="text-gray-500 text-center py-8">No stakeholder data available</p>
      </div>
    )
  }

  // Quadrant definitions
  const quadrants = [
    {
      key: 'manage',
      title: 'Manage Closely',
      subtitle: 'High Power, High Interest',
      stakeholders: matrix.highPowerHighInterest || [],
      color: '#d4185d',
      bgColor: 'rgb(212, 24, 93, 0.1)',
      position: 'top-right'
    },
    {
      key: 'keep-satisfied',
      title: 'Keep Satisfied',
      subtitle: 'High Power, Low Interest',
      stakeholders: matrix.highPowerLowInterest || [],
      color: '#ff6600',
      bgColor: 'rgb(255, 102, 0, 0.1)',
      position: 'top-left'
    },
    {
      key: 'keep-informed',
      title: 'Keep Informed',
      subtitle: 'Low Power, High Interest',
      stakeholders: matrix.lowPowerHighInterest || [],
      color: '#009900',
      bgColor: 'rgb(0, 153, 0, 0.1)',
      position: 'bottom-right'
    },
    {
      key: 'monitor',
      title: 'Monitor',
      subtitle: 'Low Power, Low Interest',
      stakeholders: matrix.lowPowerLowInterest || [],
      color: '#cccccc',
      bgColor: 'rgb(200, 200, 200, 0.1)',
      position: 'bottom-left'
    }
  ]

  const getRecommendationForQuadrant = (quadrantKey) => {
    return recommendations?.find(r => r.quadrant === quadrantKey)
  }

  return (
    <div className="bg-white rounded-lg shadow-lg overflow-hidden">
      {/* Title */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 p-6 text-white">
        <h2 className="text-2xl font-bold">Stakeholder Power/Interest Matrix</h2>
        <p className="text-blue-100 mt-1">Analyze stakeholder engagement strategies</p>
      </div>

      {/* Matrix Grid */}
      <div className="p-8">
        {/* Axis Labels */}
        <div className="mb-8">
          <div className="text-sm font-bold text-gray-600 mb-4">
            <span className="float-right">HIGH POWER →</span>
            <span>← LOW POWER</span>
          </div>
        </div>

        {/* 2x2 Grid */}
        <div className="grid grid-cols-2 gap-6 mb-8">
          {quadrants.map((quadrant) => (
            <div
              key={quadrant.key}
              className="p-6 rounded-lg border-2 cursor-pointer transition-all transform hover:scale-105"
              style={{
                backgroundColor: quadrant.bgColor,
                borderColor: quadrant.color,
                borderWidth: selectedQuadrant === quadrant.key ? '3px' : '2px'
              }}
              onClick={() => setSelectedQuadrant(selectedQuadrant === quadrant.key ? null : quadrant.key)}
            >
              {/* Quadrant Header */}
              <div className="mb-4">
                <h3 className="text-lg font-bold" style={{ color: quadrant.color }}>
                  {quadrant.title}
                </h3>
                <p className="text-xs text-gray-500 mt-1">{quadrant.subtitle}</p>
              </div>

              {/* Stakeholder Count */}
              <div className="mb-4 pb-4 border-t border-gray-300">
                <p className="text-2xl font-bold text-gray-700">
                  {quadrant.stakeholders.length}
                </p>
                <p className="text-xs text-gray-600">Stakeholders</p>
              </div>

              {/* Stakeholder List */}
              <div className="space-y-2">
                {quadrant.stakeholders.length > 0 ? (
                  quadrant.stakeholders.slice(0, 3).map((stakeholder, index) => (
                    <div
                      key={index}
                      className="bg-white p-2 rounded border border-gray-200 text-sm cursor-pointer hover:bg-gray-50"
                      onClick={(e) => {
                        e.stopPropagation()
                        setExpandedStakeholder(expandedStakeholder === stakeholder.name ? null : stakeholder.name)
                      }}
                    >
                      <p className="font-semibold text-gray-800">{stakeholder.name}</p>
                      <p className="text-xs text-gray-500">{stakeholder.type}</p>
                      <p className="text-xs text-gray-400 mt-1">
                        Mentions: {stakeholder.frequency} • Confidence: {Math.round((stakeholder.confidence || 0) * 100)}%
                      </p>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-gray-400 italic">No stakeholders</p>
                )}
                {quadrant.stakeholders.length > 3 && (
                  <p className="text-xs text-blue-600 font-semibold">+{quadrant.stakeholders.length - 3} more</p>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Axis Label at Bottom */}
        <div className="text-right">
          <p className="text-sm font-bold text-gray-600">HIGH INTEREST ↑</p>
          <p className="text-sm font-bold text-gray-600">LOW INTEREST ↓</p>
        </div>
      </div>

      {/* Detailed View for Selected Quadrant */}
      {selectedQuadrant && (
        <div className="bg-gray-50 border-t-2 border-gray-200 p-8">
          <div className="mb-6">
            <h3 className="text-xl font-bold text-gray-800 mb-2">
              {quadrants.find(q => q.key === selectedQuadrant)?.title}
            </h3>
            {getRecommendationForQuadrant(selectedQuadrant) && (
              <div className="bg-white p-4 rounded-lg border-l-4" style={{
                borderLeftColor: getRecommendationForQuadrant(selectedQuadrant).color
              }}>
                <h4 className="font-bold text-gray-800 mb-2">Recommended Strategies:</h4>
                <ul className="space-y-1">
                  {getRecommendationForQuadrant(selectedQuadrant).strategies.map((strategy, idx) => (
                    <li key={idx} className="text-sm text-gray-700 flex items-start">
                      <span className="mr-2 mt-1">•</span>
                      <span>{strategy}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* All Stakeholders in Quadrant */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {quadrants.find(q => q.key === selectedQuadrant)?.stakeholders.map((stakeholder, index) => (
              <div
                key={index}
                className="bg-white p-4 rounded-lg border border-gray-200 hover:shadow-lg transition-all cursor-pointer"
                onClick={() => setExpandedStakeholder(expandedStakeholder === stakeholder.name ? null : stakeholder.name)}
              >
                <div className="flex items-start justify-between mb-2">
                  <h5 className="font-bold text-gray-800">{stakeholder.name}</h5>
                  <span className="text-xs px-2 py-1 rounded-full" style={{
                    backgroundColor: `${stakeholder.color}20`,
                    color: stakeholder.color
                  }}>
                    {stakeholder.type}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs text-gray-600 mb-3 pb-3 border-b">
                  <div>
                    <p className="font-semibold text-gray-700">Power</p>
                    <p>{stakeholder.power}</p>
                  </div>
                  <div>
                    <p className="font-semibold text-gray-700">Interest</p>
                    <p>{stakeholder.interest}</p>
                  </div>
                </div>

                <div className="text-xs text-gray-500 space-y-1">
                  <p><strong>Frequency:</strong> {stakeholder.frequency} mentions</p>
                  <p><strong>Confidence:</strong> {Math.round((stakeholder.confidence || 0) * 100)}%</p>
                </div>

                {expandedStakeholder === stakeholder.name && stakeholder.mentions && (
                  <div className="mt-3 pt-3 border-t border-gray-200">
                    <p className="text-xs font-bold text-gray-700 mb-2">Mentions:</p>
                    <div className="space-y-1">
                      {stakeholder.mentions.slice(0, 2).map((mention, midx) => (
                        <p key={midx} className="text-xs text-gray-600 bg-gray-50 p-2 rounded">
                          <strong>{mention.ticketId}:</strong> {mention.context.substring(0, 60)}...
                        </p>
                      ))}
                      {stakeholder.mentions.length > 2 && (
                        <p className="text-xs text-blue-600 font-semibold">+{stakeholder.mentions.length - 2} more mentions</p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Summary Statistics */}
      <div className="bg-gray-50 border-t border-gray-200 p-6">
        <h3 className="text-lg font-bold text-gray-800 mb-4">Summary Statistics</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white p-4 rounded-lg border border-gray-200">
            <p className="text-2xl font-bold text-gray-800">{matrix.summary?.total || 0}</p>
            <p className="text-sm text-gray-600">Total Stakeholders</p>
          </div>
          <div className="bg-white p-4 rounded-lg border border-gray-200">
            <p className="text-2xl font-bold text-red-600">{matrix.summary?.byQuadrant?.manage || 0}</p>
            <p className="text-sm text-gray-600">Manage Closely</p>
          </div>
          <div className="bg-white p-4 rounded-lg border border-gray-200">
            <p className="text-2xl font-bold text-orange-600">{matrix.summary?.byQuadrant?.keep_satisfied || 0}</p>
            <p className="text-sm text-gray-600">Keep Satisfied</p>
          </div>
          <div className="bg-white p-4 rounded-lg border border-gray-200">
            <p className="text-2xl font-bold text-green-600">{matrix.summary?.byQuadrant?.keep_informed || 0}</p>
            <p className="text-sm text-gray-600">Keep Informed</p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default StakeholderMatrix
