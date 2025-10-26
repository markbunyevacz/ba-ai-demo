async function handleResponse(response) {
  const data = await response.json().catch(() => ({}))
  if (!response.ok) {
    const message = data.error || data.details || response.statusText || 'Diagram API error'
    throw new Error(message)
  }
  return data
}

export async function renderDefinition(definition, formats = ['svg']) {
  const response = await fetch('/api/diagrams/render', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ definition, formats })
  })

  const data = await handleResponse(response)
  return data.diagram
}

export async function generateFromTickets(tickets, options = {}) {
  const response = await fetch('/api/diagrams/generate', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ tickets, ...options })
  })

  const data = await handleResponse(response)
  return data.diagram
}

const diagramClient = {
  renderDefinition,
  generateFromTickets
}

export default diagramClient

