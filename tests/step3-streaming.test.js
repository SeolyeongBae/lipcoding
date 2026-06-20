/**
 * Step 3 — Streaming Responses (integration)
 * Requires the Copilot CLI to be installed and authenticated.
 * Automatically skipped when CLI is not available.
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { copilotIntegrationEnabled } from './copilotIntegration.js'

describe.skipIf(!copilotIntegrationEnabled)('Step 3: Streaming Responses [integration — needs CLI]', () => {
  let client
  let session

  beforeAll(async () => {
    const { createCopilotClient } = await import('../src/copilotClient.js')
    client = createCopilotClient()
    session = await client.createSession({ model: 'auto', streaming: true })
  }, 60_000)

  afterAll(async () => {
    await client?.stop()
  }, 30_000)

  it('fires assistant.message_delta events while streaming', async () => {
    const deltas = []
    const unsub = session.on('assistant.message_delta', (event) => {
      deltas.push(event.data.deltaContent)
    })

    await session.sendAndWait({ prompt: 'Count from 1 to 3, one number per line.' })
    unsub()

    expect(deltas.length).toBeGreaterThan(0)
    const full = deltas.join('')
    expect(full).toMatch(/1/)
    expect(full).toMatch(/2/)
    expect(full).toMatch(/3/)
  }, 60_000)

  it('fires session.idle after response completes', async () => {
    let idleFired = false
    const unsub = session.on('session.idle', () => {
      idleFired = true
    })

    await session.sendAndWait({ prompt: 'Say "done".' })
    unsub()

    expect(idleFired).toBe(true)
  }, 60_000)
})

if (!copilotIntegrationEnabled) {
  describe('Step 3: Streaming Responses', () => {
    it.skip('⚠️  Copilot integration disabled (no CLI auth / running in CI)', () => {})
  })
}
