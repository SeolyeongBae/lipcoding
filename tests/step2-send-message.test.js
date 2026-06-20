/**
 * Step 2 — Send a Message (integration)
 * Requires the Copilot CLI to be installed and authenticated.
 * Automatically skipped when CLI is not available.
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { execSync } from 'child_process'
import os from 'os'

// Share auth with the SDK's bundled CLI via COPILOT_HOME
process.env.COPILOT_HOME = process.env.COPILOT_HOME || `${os.homedir()}/.copilot`

const copilotAvailable = (() => {
  try {
    execSync('copilot --version', {
      stdio: 'pipe',
      env: { ...process.env, PATH: `${os.homedir()}/.local/bin:${process.env.PATH}` },
    })
    return true
  } catch {
    return false
  }
})()

describe.skipIf(!copilotAvailable)('Step 2: Send Message [integration — needs CLI]', () => {
  let client
  let session

  beforeAll(async () => {
    const { CopilotClient } = await import('@github/copilot-sdk')
    client = new CopilotClient()
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

if (!copilotAvailable) {
  describe('Step 2: Send Message', () => {
    it.skip('⚠️  Copilot CLI not found — run: ~/.local/bin/copilot login', () => {})
  })
}
