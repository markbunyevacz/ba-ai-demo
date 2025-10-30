import apiClient from './apiClient'

export const fetchStandards = async () => {
  const data = await apiClient.get('/compliance/standards')
  return data?.standards || []
}

export const generateReport = async (tickets, options = {}) => {
  const data = await apiClient.post('/compliance/report', { tickets, ...options })
  return data?.report
}

export const validateTickets = async (tickets, options = {}) => {
  const data = await apiClient.post('/compliance/validate', { tickets, ...options })
  return data?.results
}

const complianceClient = {
  fetchStandards,
  generateReport,
  validateTickets,
}

export default complianceClient


