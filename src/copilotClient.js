import { CopilotClient } from "@github/copilot-sdk";
import { configureCopilotCliPath } from "./copilotCliPath";

/**
 * Creates a CopilotClient that authenticates via the COPILOT_TOKEN environment
 * variable when present.
 *
 * `new CopilotClient()` does NOT read any token from the environment on its own;
 * it only authenticates with an explicit `gitHubToken` option or with the
 * logged-in user (`~/.copilot`). In a container (Azure) or in CI there is no
 * logged-in user, so we must pass the token explicitly.
 *
 * - When COPILOT_TOKEN is set (production / CI): use it as `gitHubToken`.
 * - When it is absent (local dev): fall back to the logged-in user.
 *
 * @param {import("@github/copilot-sdk").CopilotClientOptions} [options]
 * @returns {CopilotClient}
 */
export function createCopilotClient(options = {}) {
  configureCopilotCliPath();

  const token = process.env.COPILOT_TOKEN;

  return new CopilotClient({
    ...(token ? { gitHubToken: token } : {}),
    ...options,
  });
}
