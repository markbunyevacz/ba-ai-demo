import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'

import { fetchStandards, generateReport, validateTickets } from '../complianceClient.js'

const createResponse = (body, ok = true, status = 200) => ({
  ok,
  status,
  json: vi.fn().mockResolvedValue(body)
})

describe('complianceClient', () => {
  beforeEach(() => {
    global.fetch = vi.fn()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('fetches standards list', async () => {
    global.fetch.mockResolvedValue(createResponse({ standards: ['PMI', 'BABOK'] }))

    const standards = await fetchStandards()

    expect(global.fetch).toHaveBeenCalledWith('/api/compliance/standards')
    expect(standards).toEqual(['PMI', 'BABOK'])
  })

  it('handles report generation', async () => {
    const reportPayload = { report: { totalTickets: 1 } }
    global.fetch.mockResolvedValue(createResponse(reportPayload))

    const report = await generateReport([{ id: 'TIC-1' }])

    expect(global.fetch).toHaveBeenCalled()
    expect(report).toEqual(reportPayload.report)
  })

  it('throws on API error', async () => {
    global.fetch.mockResolvedValue(createResponse({ error: 'Bad request' }, false, 400))

    await expect(validateTickets([])).rejects.toThrow('Bad request')
  })
})


