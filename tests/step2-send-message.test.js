/**
 * Step 2 — Send a Message (integration)
 * Requires the Copilot CLI to be installed and authenticated.
 * Automatically skipped when CLI is not available.
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { copilotIntegrationEnabled } from './copilotIntegration.js'

describe.skipIf(!copilotIntegrationEnabled)('Step 2: Send Message [integration — needs CLI]', () => {
  let client
  let session

  beforeAll(async () => {
    const { createCopilotClient } = await import('../src/copilotClient.js')
    client = createCopilotClient()
    session = await client.createSession({ model: 'auto' })
  }, 60_000)

  afterAll(async () => {
    await client?.stop()
  }, 30_000)

  it('receives a response to a simple prompt', async () => {
    const response = await session.sendAndWait({
      prompt: 'Reply with exactly the word: hello',
    })
    expect(response).toBeDefined()
    const content = (response?.data?.content ?? '').toLowerCase()
    expect(content).toContain('hello')
  }, 60_000)
})

if (!copilotIntegrationEnabled) {
  describe('Step 2: Send Message', () => {
    it.skip('⚠️  Copilot integration disabled (no CLI auth / running in CI)', () => {})
  })
}
