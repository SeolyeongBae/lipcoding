/**
 * React UI Tests — Weather Assistant App
 * Tests rendering, interaction, and error handling.
 * No Copilot CLI required (fetch is mocked).
 */
// @vitest-environment jsdom
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi, describe, it, expect, beforeEach } from "vitest";
import App from "./App";

// Minimal readable SSE body helper
function makeSseBody(events) {
  const text = events.map((e) => `data: ${JSON.stringify(e)}\n\n`).join("");
  const encoder = new TextEncoder();
  const encoded = encoder.encode(text);
  let pos = 0;
  return {
    getReader: () => ({
      read: vi.fn().mockImplementation(async () => {
        if (pos === 0) {
          pos = encoded.length;
          return { done: false, value: encoded };
        }
        return { done: true, value: undefined };
      }),
    }),
  };
}

beforeEach(() => {
  global.fetch = vi.fn();
});

describe("App: Weather Assistant UI", () => {
  it("renders the header with title and SDK badge", () => {
    render(<App />);
    expect(screen.getByText("Weather Assistant")).toBeInTheDocument();
    expect(
      screen.getByText(/powered by GitHub Copilot SDK/i),
    ).toBeInTheDocument();
  });

  it("shows welcome screen with suggestions when no messages", () => {
    render(<App />);
    expect(screen.getByTestId("welcome")).toBeInTheDocument();
    expect(
      screen.getByText("What's the weather in Seoul?"),
    ).toBeInTheDocument();
    expect(screen.getByText("Compare Tokyo and London")).toBeInTheDocument();
    expect(screen.getByText("Is it sunny in Paris?")).toBeInTheDocument();
  });

  it("renders chat input and disabled send button initially", () => {
    render(<App />);
    expect(screen.getByRole("textbox")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /send/i })).toBeDisabled();
  });

  it("enables send button when user types in input", async () => {
    render(<App />);
    await userEvent.type(screen.getByRole("textbox"), "Hello");
    expect(screen.getByRole("button", { name: /send/i })).not.toBeDisabled();
  });

  it("clears input after sending a message", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      body: makeSseBody([{ type: "delta", content: "Hi" }, { type: "done" }]),
    });

    render(<App />);
    const input = screen.getByRole("textbox");
    await userEvent.type(input, "Weather in Seoul?");
    fireEvent.submit(input.closest("form"));

    await waitFor(() => expect(input.value).toBe(""));
  });

  it("clicking a suggestion calls the backend /api/chat", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      body: makeSseBody([{ type: "done" }]),
    });

    render(<App />);
    fireEvent.click(screen.getByText("What's the weather in Seoul?"));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        "/api/chat",
        expect.objectContaining({
          method: "POST",
          body: expect.stringContaining("Seoul"),
        }),
      );
    });
  });

  it("displays user and assistant messages after a conversation", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      body: makeSseBody([
        { type: "delta", content: "It is 72°F and sunny in Seoul." },
        { type: "done" },
      ]),
    });

    render(<App />);
    const input = screen.getByRole("textbox");
    await userEvent.type(input, "What's the weather in Seoul?");
    fireEvent.submit(input.closest("form"));

    await waitFor(() => {
      expect(screen.getByTestId("messages")).toBeInTheDocument();
    });
    expect(screen.getByTestId("message-user")).toBeInTheDocument();
    expect(screen.getByTestId("message-assistant")).toBeInTheDocument();
  });

  it("shows error alert when fetch rejects", async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error("Network error"));

    render(<App />);
    const input = screen.getByRole("textbox");
    await userEvent.type(input, "Weather?");
    fireEvent.submit(input.closest("form"));

    await waitFor(() => {
      expect(screen.getByRole("alert")).toBeInTheDocument();
      expect(screen.getByTestId("error")).toHaveTextContent("Network error");
    });
  });

  it("shows error alert when server returns non-ok status", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      json: async () => ({ error: "Internal server error" }),
    });

    render(<App />);
    await userEvent.type(screen.getByRole("textbox"), "Weather?");
    fireEvent.submit(screen.getByRole("textbox").closest("form"));

    await waitFor(() => {
      expect(screen.getByRole("alert")).toBeInTheDocument();
    });
  });
});
