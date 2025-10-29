const handleResponse = async (response) => {
  const data = await response.json().catch(() => ({}))

  if (!response.ok) {
    const message = data.error || data.details || response.statusText || 'Compliance API error'
    throw new Error(message)
  }

  return data
}

export const fetchStandards = async () => {
  const response = await fetch('/api/compliance/standards')
  const data = await handleResponse(response)
  return data.standards || []
}

export const generateReport = async (tickets, options = {}) => {
  const response = await fetch('/api/compliance/report', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ tickets, ...options })
  })

  const data = await handleResponse(response)
  return data.report
}

export const validateTickets = async (tickets, options = {}) => {
  const response = await fetch('/api/compliance/validate', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ tickets, ...options })
  })

  const data = await handleResponse(response)
  return data.results
}

const complianceClient = {
  fetchStandards,
  generateReport,
  validateTickets
}

export default complianceClient


