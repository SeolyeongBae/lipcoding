import { defineTool } from "@github/copilot-sdk";
import { createCopilotClient } from "../../../src/copilotClient";

// Conditions for mock weather tool
const CONDITIONS = ["sunny", "cloudy", "rainy", "partly cloudy"];

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
    const temp = Math.floor(Math.random() * 30) + 50;
    const condition = CONDITIONS[Math.floor(Math.random() * CONDITIONS.length)];
    return { city, temperature: `${temp}°F`, condition };
  },
});

// Singleton session — reused across requests within the same server process
let client = null;
let session = null;
let initPromise = null;

async function getSession() {
  if (session) return session;
  if (initPromise) return initPromise;
  initPromise = (async () => {
    client = createCopilotClient();
    session = await client.createSession({
      model: "auto",
      streaming: true,
      tools: [getWeather],
    });
    return session;
  })();
  return initPromise;
}

export async function GET() {
  return Response.json({ status: "ok", sdk: "@github/copilot-sdk" });
}

export async function POST(request) {
  const body = await request.json().catch(() => ({}));
  const { message } = body;

  if (!message) {
    return Response.json({ error: "message is required" }, { status: 400 });
  }

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const send = (data) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
      };

      try {
        const sess = await getSession();

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
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
