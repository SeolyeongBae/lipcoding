/**
 * Step 4 — Custom Tool Definition
 * Tests that tools can be defined and their handlers work correctly.
 * No Copilot CLI required.
 */
import { describe, it, expect } from "vitest";
import { defineTool } from "@github/copilot-sdk";

const CONDITIONS = ["sunny", "cloudy", "rainy", "partly cloudy"];

const weatherHandler = async ({ city }) => {
  const temp = Math.floor(Math.random() * 30) + 50;
  const condition = CONDITIONS[Math.floor(Math.random() * CONDITIONS.length)];
  return { city, temperature: `${temp}°F`, condition };
};

describe("Step 4: Custom Tool Definition", () => {
  it("defineTool creates a tool without throwing", () => {
    expect(() =>
      defineTool("get_weather", {
        description: "Get the current weather for a city",
        parameters: {
          type: "object",
          properties: {
            city: { type: "string", description: "The city name" },
          },
          required: ["city"],
        },
        handler: weatherHandler,
      }),
    ).not.toThrow();
  });

  it("tool handler returns correct shape", async () => {
    const result = await weatherHandler({ city: "Seoul" });
    expect(result.city).toBe("Seoul");
    expect(result.temperature).toMatch(/^\d+°F$/);
    expect(CONDITIONS).toContain(result.condition);
  });

  it("tool handler returns valid temperature range (50–80°F)", async () => {
    for (let i = 0; i < 20; i++) {
      const { temperature } = await weatherHandler({ city: "Tokyo" });
      const temp = parseInt(temperature);
      expect(temp).toBeGreaterThanOrEqual(50);
      expect(temp).toBeLessThanOrEqual(80);
    }
  });

  it("tool handler works for multiple cities", async () => {
    const cities = ["Seoul", "Tokyo", "London", "New York", "Paris"];
    for (const city of cities) {
      const result = await weatherHandler({ city });
      expect(result.city).toBe(city);
      expect(typeof result.temperature).toBe("string");
      expect(typeof result.condition).toBe("string");
    }
  });
});
