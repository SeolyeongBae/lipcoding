/**
 * Step 5 — Next.js API Route Handler
 * Tests the /api/chat route that bridges the browser and Copilot SDK.
 * GET health and error-path POST require no Copilot CLI.
 */
import { describe, it, expect } from 'vitest'
import { GET, POST } from '../app/api/chat/route.js'

describe('Step 5: Next.js API Route Handler', () => {
  it('GET returns health status ok', async () => {
    const res = await GET()
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.status).toBe('ok')
    expect(body.sdk).toContain('copilot-sdk')
  })

  it('POST with empty body returns 400', async () => {
    const req = new Request('http://localhost/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    })
    const res = await POST(req)
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toBeDefined()
  })

  it('POST with empty message string returns 400', async () => {
    const req = new Request('http://localhost/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: '' }),
    })
    const res = await POST(req)
    expect(res.status).toBe(400)
  })

  it('POST with valid message returns SSE Content-Type stream', async () => {
    const req = new Request('http://localhost/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: 'hello' }),
    })
    const res = await POST(req)
    expect(res.headers.get('Content-Type')).toContain('text/event-stream')
    expect(res.body).toBeDefined()
  })
})
