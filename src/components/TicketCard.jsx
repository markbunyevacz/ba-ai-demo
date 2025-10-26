const TicketCard = ({ ticket }) => {
  // Priority mapping with colors
  const getPriorityConfig = (priority) => {
    switch (priority?.toLowerCase()) {
      case 'kritikus':
      case 'critical':
        return {
          label: 'Critical',
          color: 'bg-red-100 text-red-800 border-red-200',
          dotColor: 'bg-red-500'
        }
      case 'magas':
      case 'high':
        return {
          label: 'High',
          color: 'bg-orange-100 text-orange-800 border-orange-200',
          dotColor: 'bg-orange-500'
        }
      case 'közepes':
      case 'medium':
        return {
          label: 'Medium',
          color: 'bg-yellow-100 text-yellow-800 border-yellow-200',
          dotColor: 'bg-yellow-500'
        }
      case 'alacsony':
      case 'low':
        return {
          label: 'Low',
          color: 'bg-green-100 text-green-800 border-green-200',
          dotColor: 'bg-green-500'
        }
      default:
        return {
          label: 'Medium',
          color: 'bg-yellow-100 text-yellow-800 border-yellow-200',
          dotColor: 'bg-yellow-500'
        }
    }
  }

  const priorityConfig = getPriorityConfig(ticket.priority)

  // Format user story in Hungarian style
  const formatUserStory = (userStory) => {
    if (!userStory) return null

    // Try to parse "As a [role], I want [action], so that [benefit]" format
    const asMatch = userStory.match(/as\s+(?:a\s+)?([^,]+),\s*i\s+want\s+([^,]+),\s*so\s+that\s+(.+)/i)
    if (asMatch) {
      return `Mint ${asMatch[1].trim()}, szeretném ${asMatch[2].trim().toLowerCase()}, hogy ${asMatch[3].trim().toLowerCase()}`
    }

    return userStory
  }

  // Format acceptance criteria as bullet points
  const formatAcceptanceCriteria = (criteria) => {
    if (!criteria) return []

    // Split by newlines or bullet points
    return criteria
      .split(/\n|•|\*|-/)
      .map(c => c.trim())
      .filter(c => c.length > 0)
  }

  const acceptanceCriteria = formatAcceptanceCriteria(ticket.acceptanceCriteria)

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 hover:shadow-lg hover:border-slate-300 transition-all duration-200 p-6 h-full flex flex-col">
      {/* Header with ID and Priority */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center space-x-2">
          <span className="text-sm font-mono font-bold text-[#003366] bg-slate-100 px-2 py-1 rounded">
            {ticket.id || 'MVM-XXXX'}
          </span>
          <div className={`flex items-center space-x-1 px-2 py-1 text-xs font-medium rounded-full border ${priorityConfig.color}`}>
            <div className={`w-2 h-2 rounded-full ${priorityConfig.dotColor}`}></div>
            <span>{priorityConfig.label}</span>
          </div>
        </div>
      </div>

      {/* Summary */}
      {ticket.summary && (
        <h3 className="font-semibold text-slate-900 text-base mb-3 leading-tight">
          {ticket.summary}
        </h3>
      )}

      {/* Description */}
      {ticket.description && (
        <div className="mb-4 p-3 bg-slate-50 rounded-lg border-l-4 border-[#003366]">
          <p className="text-sm text-slate-700 italic">
            {formatUserStory(ticket.description)}
          </p>
        </div>
      )}

      {/* Epic Link */}
      {ticket.epic && (
        <div className="mb-3">
          <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">Epic</span>
          <p className="text-sm text-slate-700 mt-1">{ticket.epic}</p>
        </div>
      )}

      {/* Acceptance Criteria */}
      {acceptanceCriteria.length > 0 && (
        <div className="mb-4 flex-grow">
          <span className="text-xs font-medium text-slate-500 uppercase tracking-wide block mb-2">
            Acceptance Criteria
          </span>
          <ul className="space-y-1">
            {acceptanceCriteria.map((criteria, index) => (
              <li key={index} className="flex items-start space-x-2 text-sm text-slate-600">
                <span className="text-[#003366] mt-1 flex-shrink-0">•</span>
                <span className="flex-1">{criteria}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Footer with Assignee and Timestamp */}
      <div className="flex items-center justify-between text-xs text-slate-500 mt-auto pt-3 border-t border-slate-100">
        <div className="flex items-center space-x-1">
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
          <span>{ticket.assignee || 'Unassigned'}</span>
        </div>

        <div className="flex items-center space-x-1">
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          <span>Created {ticket.createdAt ? new Date(ticket.createdAt).toLocaleDateString('en-US') : 'Today'}</span>
        </div>
      </div>
    </div>
  )
}

export default TicketCard
