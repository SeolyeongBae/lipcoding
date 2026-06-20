/**
 * Step 1 — SDK Installation & Import
 * Verifies that @github/copilot-sdk is installed and its exports are accessible.
 * No Copilot CLI required.
 */
import { describe, it, expect } from "vitest";

describe("Step 1: SDK Installation", () => {
  it("CopilotClient is importable", async () => {
    const { CopilotClient } = await import("@github/copilot-sdk");
    expect(CopilotClient).toBeDefined();
    expect(typeof CopilotClient).toBe("function");
  });

  it("defineTool is importable", async () => {
    const { defineTool } = await import("@github/copilot-sdk");
    expect(defineTool).toBeDefined();
    expect(typeof defineTool).toBe("function");
  });

  it("CopilotClient instance has expected methods", async () => {
    const { CopilotClient } = await import("@github/copilot-sdk");
    const client = new CopilotClient();
    expect(typeof client.createSession).toBe("function");
    expect(typeof client.stop).toBe("function");
  });

  it("RuntimeConnection is importable", async () => {
    const { RuntimeConnection } = await import("@github/copilot-sdk");
    expect(RuntimeConnection).toBeDefined();
  });
});
