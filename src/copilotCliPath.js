import path from "node:path";
import fs from "node:fs";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);

function resolveFromSdkPackage() {
  const sdkUrl = import.meta.resolve?.("@github/copilot-sdk");
  if (!sdkUrl) return undefined;

  const sdkEntryPath = fileURLToPath(sdkUrl);
  const sdkPackageDir = path.dirname(path.dirname(sdkEntryPath));
  const candidate = path.join(sdkPackageDir, "..", "copilot", "npm-loader.js");

  return candidate;
}

function resolveFromPnpmStore(root = process.cwd()) {
  const pnpmDir = path.join(root, "node_modules", ".pnpm");
  if (!fs.existsSync(pnpmDir)) return undefined;

  for (const entry of fs.readdirSync(pnpmDir)) {
    if (!entry.startsWith("@github+copilot@")) continue;

    const candidate = path.join(
      pnpmDir,
      entry,
      "node_modules",
      "@github",
      "copilot",
      "npm-loader.js",
    );

    if (fs.existsSync(candidate)) return candidate;
  }

  return undefined;
}

export function configureCopilotCliPath(env = process.env) {
  if (env.COPILOT_CLI_PATH) return env.COPILOT_CLI_PATH;

  const candidates = [
    resolveFromPnpmStore,
    () =>
      path.join(
        path.dirname(require.resolve("@github/copilot/package.json")),
        "npm-loader.js",
      ),
    resolveFromSdkPackage,
  ];

  for (const resolveCandidate of candidates) {
    try {
      const cliPath = resolveCandidate();
      if (cliPath && fs.existsSync(cliPath)) {
        env.COPILOT_CLI_PATH = cliPath;
        return cliPath;
      }
    } catch {
      // Try the next resolution strategy.
    }
  }

  return undefined;
}
