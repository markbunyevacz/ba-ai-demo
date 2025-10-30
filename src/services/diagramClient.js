import apiClient from './apiClient'

export async function renderDefinition(definition, formats = ['svg']) {
  const data = await apiClient.post('/diagrams/render', { definition, formats })
  return data?.diagram
}

export async function generateFromTickets(tickets, options = {}) {
  const data = await apiClient.post('/diagrams/generate', { tickets, ...options })
  return data?.diagram
}

const diagramClient = {
  renderDefinition,
  generateFromTickets,
}

export default diagramClient

