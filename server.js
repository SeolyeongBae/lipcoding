import express from "express";
import { CopilotClient, defineTool } from "@github/copilot-sdk";
import { fileURLToPath } from "url";

const app = express();
app.use(express.json());

// CORS for local dev
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.header("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.sendStatus(204);
  next();
});

// Step 4: Custom weather tool
const getWeather = defineTool("get_weather", {
  description: "Get the current weather for a city",
  parameters: {
    type: "object",
    properties: {
      city: { type: "string", description: "The city name" },
    },
    required: ["city"],
  },
  handler: async ({ city }) => {
    const conditions = ["sunny", "cloudy", "rainy", "partly cloudy"];
    const temp = Math.floor(Math.random() * 30) + 50;
    const condition = conditions[Math.floor(Math.random() * conditions.length)];
    return { city, temperature: `${temp}°F`, condition };
  },
});

// Lazy singleton session (Step 5: reusable assistant)
let client = null;
let session = null;
let sessionPromise = null;

async function initSession() {
  if (session) return session;
  if (sessionPromise) return sessionPromise;
  sessionPromise = (async () => {
    client = new CopilotClient();
    session = await client.createSession({
      model: "auto",
      streaming: true,
      tools: [getWeather],
    });
    return session;
  })();
  return sessionPromise;
}

// Health check — no Copilot CLI needed
app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", sdk: "@github/copilot-sdk" });
});

// Chat endpoint — streams SSE back to the browser
app.post("/api/chat", async (req, res) => {
  const { message } = req.body;
  if (!message) return res.status(400).json({ error: "message is required" });

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders();

  const send = (data) => res.write(`data: ${JSON.stringify(data)}\n\n`);

  try {
    const sess = await initSession();

    const unsubDelta = sess.on("assistant.message_delta", (event) => {
      send({ type: "delta", content: event.data.deltaContent });
    });
    const unsubIdle = sess.on("session.idle", () => {
      send({ type: "done" });
    });

    await sess.sendAndWait({ prompt: message });

    unsubDelta();
    unsubIdle();
  } catch (err) {
    send({ type: "error", message: err.message });
  } finally {
    res.end();
  }
});

// Start server only when run directly (not imported in tests)
const isMain = process.argv[1] === fileURLToPath(import.meta.url);
if (isMain) {
  const PORT = process.env.PORT || 3001;
  app.listen(PORT, () => {
    console.log(`🤖 Copilot backend running on http://localhost:${PORT}`);
    console.log(`   React dev server proxy: http://localhost:5173`);
  });
}

export { app };
