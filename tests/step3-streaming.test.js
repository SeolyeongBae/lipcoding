/**
 * Step 3 — Streaming Responses (integration)
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

describe.skipIf(!copilotAvailable)('Step 3: Streaming Responses [integration — needs CLI]', () => {
  let client
  let session

  beforeAll(async () => {
    const { CopilotClient } = await import('@github/copilot-sdk')
    client = new CopilotClient()
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

if (!copilotAvailable) {
  describe('Step 3: Streaming Responses', () => {
    it.skip('⚠️  Copilot CLI not found — run: ~/.local/bin/copilot login', () => {})
  })
}
