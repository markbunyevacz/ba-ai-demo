import { useState, useEffect, useMemo } from 'react'
import CompliancePanel from './CompliancePanel.jsx'

const GroundingDashboard = ({ tickets = [] }) => {
  const [groundingStats, setGroundingStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    fetchGroundingStats()
  }, [])

  const fetchGroundingStats = async () => {
    try {
      const response = await fetch('/api/grounding/stats')
      const data = await response.json()
      
      if (response.ok) {
        setGroundingStats(data.grounding)
      } else {
        setError(data.error || 'Failed to fetch grounding stats')
      }
    } catch (err) {
      setError('Network error while fetching grounding stats')
    } finally {
      setLoading(false)
    }
  }

  const calculateTicketStats = () => {
    if (!tickets.length) return null

    const totalTickets = tickets.length
    const validTickets = tickets.filter(t => t._grounding?.validated).length
    const invalidTickets = totalTickets - validTickets
    const avgConfidence = tickets.reduce((sum, t) => sum + (t._grounding?.confidence || 0), 0) / totalTickets
    const totalIssues = tickets.reduce((sum, t) => sum + (t._grounding?.issues?.length || 0), 0)
    const totalWarnings = tickets.reduce((sum, t) => sum + (t._grounding?.warnings?.length || 0), 0)

    return {
      totalTickets,
      validTickets,
      invalidTickets,
      avgConfidence: Math.round(avgConfidence * 100) / 100,
      totalIssues,
      totalWarnings,
      validationRate: Math.round((validTickets / totalTickets) * 100)
    }
  }

  const ticketStats = calculateTicketStats()

  const complianceItems = useMemo(() => (
    tickets
      .map(ticket => ({
        id: ticket.id,
        summary: ticket.summary,
        compliance: ticket._grounding?.compliance
      }))
      .filter(item => item.compliance)
  ), [tickets])

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-lg p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="space-y-3">
            <div className="h-4 bg-gray-200 rounded"></div>
            <div className="h-4 bg-gray-200 rounded w-5/6"></div>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6">
        <div className="flex items-center">
          <svg className="h-5 w-5 text-red-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd"/>
          </svg>
          <span className="text-red-800 font-medium">Error: {error}</span>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-xl font-semibold text-[#003366]">AI Grounding Dashboard</h3>
        <div className="flex items-center space-x-2">
          <div className="w-3 h-3 bg-green-500 rounded-full"></div>
          <span className="text-sm text-gray-600">Grounding Active</span>
        </div>
      </div>

      {/* Grounding Statistics */}
      {groundingStats && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-blue-50 rounded-lg p-4">
            <div className="flex items-center">
              <div className="bg-blue-500 rounded-full p-2 mr-3">
                <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                </svg>
              </div>
              <div>
                <p className="text-sm text-blue-600">Knowledge Base</p>
                <p className="text-lg font-semibold text-blue-800">{groundingStats.knowledgeBaseSize} Rules</p>
              </div>
            </div>
          </div>

          <div className="bg-green-50 rounded-lg p-4">
            <div className="flex items-center">
              <div className="bg-green-500 rounded-full p-2 mr-3">
                <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd"/>
                </svg>
              </div>
              <div>
                <p className="text-sm text-green-600">Validation Rules</p>
                <p className="text-lg font-semibold text-green-800">{groundingStats.validationRulesCount} Patterns</p>
              </div>
            </div>
          </div>

          <div className="bg-purple-50 rounded-lg p-4">
            <div className="flex items-center">
              <div className="bg-purple-500 rounded-full p-2 mr-3">
                <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd"/>
                </svg>
              </div>
              <div>
                <p className="text-sm text-purple-600">Last Updated</p>
                <p className="text-lg font-semibold text-purple-800">
                  {new Date(groundingStats.lastUpdated).toLocaleDateString()}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Ticket Validation Results */}
      {ticketStats && (
        <div className="space-y-4">
          <h4 className="text-lg font-semibold text-gray-800">Current Session Validation</h4>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-[#003366]">{ticketStats.totalTickets}</div>
              <div className="text-sm text-gray-600">Total Tickets</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{ticketStats.validTickets}</div>
              <div className="text-sm text-gray-600">Valid</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600">{ticketStats.invalidTickets}</div>
              <div className="text-sm text-gray-600">Invalid</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{ticketStats.validationRate}%</div>
              <div className="text-sm text-gray-600">Success Rate</div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Average Confidence</span>
                <span className="text-lg font-semibold text-gray-800">{ticketStats.avgConfidence}</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                <div 
                  className="bg-blue-500 h-2 rounded-full" 
                  style={{ width: `${ticketStats.avgConfidence * 100}%` }}
                ></div>
              </div>
            </div>

            <div className="bg-yellow-50 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-yellow-600">Total Issues</span>
                <span className="text-lg font-semibold text-yellow-800">{ticketStats.totalIssues}</span>
              </div>
            </div>

            <div className="bg-orange-50 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-orange-600">Total Warnings</span>
                <span className="text-lg font-semibold text-orange-800">{ticketStats.totalWarnings}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      <CompliancePanel items={complianceItems} />

      {/* Grounding Features */}
      <div className="mt-6 pt-6 border-t border-gray-200">
        <h4 className="text-lg font-semibold text-gray-800 mb-4">Grounding Features</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <div className="flex items-center">
              <svg className="w-4 h-4 text-green-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/>
              </svg>
              <span className="text-sm text-gray-700">RAG-based validation</span>
            </div>
            <div className="flex items-center">
              <svg className="w-4 h-4 text-green-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/>
              </svg>
              <span className="text-sm text-gray-700">Hallucination detection</span>
            </div>
            <div className="flex items-center">
              <svg className="w-4 h-4 text-green-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/>
              </svg>
              <span className="text-sm text-gray-700">Source attribution</span>
            </div>
          </div>
          <div className="space-y-2">
            <div className="flex items-center">
              <svg className="w-4 h-4 text-green-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/>
              </svg>
              <span className="text-sm text-gray-700">Business rule enforcement</span>
            </div>
            <div className="flex items-center">
              <svg className="w-4 h-4 text-green-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/>
              </svg>
              <span className="text-sm text-gray-700">Confidence scoring</span>
            </div>
            <div className="flex items-center">
              <svg className="w-4 h-4 text-green-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/>
              </svg>
              <span className="text-sm text-gray-700">Real-time monitoring</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default GroundingDashboard
