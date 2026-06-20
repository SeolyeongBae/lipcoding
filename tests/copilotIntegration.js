/**
 * Shared guard for Copilot CLI integration tests.
 *
 * These tests spawn the real Copilot CLI and create an authenticated session.
 * The CLI binary is resolvable in CI (pnpm exposes it on node_modules/.bin),
 * so binary presence alone is not enough — the session also needs auth.
 *
 * We therefore only enable the integration tests when:
 *   - the `copilot` binary is runnable, AND
 *   - we are NOT in a CI environment without an explicit auth token.
 *
 * Locally the developer is logged in (CI unset) so the tests run; in CI they
 * are skipped unless COPILOT_TOKEN is provided as a secret.
 */
import { execSync } from "child_process";
import os from "os";

// Share auth with the SDK's bundled CLI via COPILOT_HOME.
process.env.COPILOT_HOME =
  process.env.COPILOT_HOME || `${os.homedir()}/.copilot`;

const binaryAvailable = (() => {
  try {
    execSync("copilot --version", {
      stdio: "pipe",
      env: {
        ...process.env,
        PATH: `${os.homedir()}/.local/bin:${process.env.PATH}`,
      },
    });
    return true;
  } catch {
    return false;
  }
})();

const hasAuthToken = Boolean(process.env.COPILOT_TOKEN);
const inCi = Boolean(process.env.CI);

export const copilotIntegrationEnabled =
  binaryAvailable && (hasAuthToken || !inCi);
